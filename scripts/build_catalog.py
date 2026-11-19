"""Build the browser's bilingual map catalog from an installed copy of Stellaris."""

import argparse
from collections import Counter
import json
from pathlib import Path
import re


# The game uses repeated keys for production blocks, so keep entries in order.
TOKEN = re.compile(r'#[^\n]*|"(?:\\.|[^"\\])*"|[{}=]|[^\s#{}="]+')
LOC = re.compile(r'^\s*([^#\s:]+):\d*\s*"((?:\\.|[^"\\])*)"')
REFERENCE = re.compile(r'\$([^$|]+)(?:\|[^$]*)?\$')
DEFINITION = re.compile(r'^([\w.-]+)\s*=\s*\{', re.MULTILINE)
ORBITAL_CATEGORIES = {'orbital_mining_deposits', 'orbital_research_deposits'}
NAME_FILES = {'random_names', 'name_parts_00_empire_names', 'empire_formats',
              'formats_00_empire_names'}
NAME_VARIABLES = {'name', 'number', 'prefix', 'suffix', 'title', 'parent', 'numeral', '1', '2', '3'}
HABITAT_EXTRACTION_JOBS = {
    'job_gas_extractor_add': 'exotic_gases', 'job_gas_extraction_drone_add': 'exotic_gases',
    'job_crystal_miner_add': 'rare_crystals', 'job_crystal_mining_drone_add': 'rare_crystals',
    'job_mote_harvester_add': 'volatile_motes', 'job_mote_harvesting_drone_add': 'volatile_motes',
}


def read_script(path):
    tokens = [m[0] for m in TOKEN.finditer(path.read_text(encoding='utf-8-sig'))
              if not m[0].startswith('#')]
    position = 0

    def block():
        nonlocal position
        result = []
        while position < len(tokens):
            key = tokens[position]
            position += 1
            if key == '}':
                break
            if key == '{':
                block()
                continue
            if position >= len(tokens) or tokens[position] != '=':
                continue
            raw = tokens[position + 1]
            position += 2
            value = block() if raw == '{' else raw.strip('"')
            result.append((key, value))
        return result

    return block()


def definitions(common, folder):
    for path in sorted((common / folder).glob('*.txt')):
        for key, value in read_script(path):
            if isinstance(value, list):
                yield key, value


def scalar(entries, key):
    return next((value for name, value in entries if name == key and isinstance(value, str)), None)


def positive_amount(value, variables):
    if isinstance(value, str):
        raw = variables.get(value, value)
        if re.fullmatch(r'\d+(?:\.\d+)?', raw):
            return float(raw) if '.' in raw else int(raw)
    return 0


def modifier_resources(entries, strategic, variables):
    for key, value in entries:
        if key == 'modifier' and isinstance(value, list):
            yield from modifier_resources(value, strategic, variables)
        elif positive_amount(value, variables):
            if key in HABITAT_EXTRACTION_JOBS:
                yield HABITAT_EXTRACTION_JOBS[key]
            elif key.startswith('planet_') and key.endswith('_produces_add'):
                yield from (res for res in strategic if key.endswith(f'_{res}_produces_add'))


def deposit_data(entries, resources, strategic, important_categories, variables):
    record = {}
    production = Counter()
    surface_production = Counter()
    surface = set()
    planetary = scalar(entries, 'is_for_colonizable') == 'yes'
    station = scalar(entries, 'station') in {'shipclass_mining_station', 'shipclass_research_station'}
    if not station and scalar(entries, 'category') in important_categories:
        record['important'] = True
        planetary = True
    for key, values in entries:
        if key in {'planet_modifier', 'triggered_planet_modifier'} and isinstance(values, list):
            planetary = True
            surface.update(modifier_resources(values, strategic, variables))
        if key != 'resources' or not isinstance(values, list):
            continue
        category = scalar(values, 'category')
        if not station:
            direct = all(k in {'category', 'cost', 'upkeep', 'produces'} for k, _ in values)
            for name, produces in values:
                if name == 'produces' and isinstance(produces, list):
                    planetary = True
                    fixed = direct and all(k in resources for k, _ in produces)
                    for resource, value in produces:
                        amount = positive_amount(value, variables)
                        if resource in strategic and amount:
                            surface.add(resource)
                            if fixed:
                                surface_production[resource] += amount
            continue
        if category not in ORBITAL_CATEGORIES:
            record['conditional'] = True
            continue
        for name, produces in values:
            if name != 'produces':
                continue
            # A trigger or multiplier applies to this complete production block.
            if (not isinstance(produces, list) or any(k not in resources for k, _ in produces)
                    or any(k in {'trigger', 'potential', 'mult', 'inline_script'} for k, _ in values)):
                record['conditional'] = True
                continue
            for resource, amount in produces:
                if isinstance(amount, str) and re.fullmatch(r'-?\d+(?:\.\d+)?', amount):
                    production[resource] += float(amount)
                else:
                    record['conditional'] = True
    if production:
        record['yield'] = {k: int(v) if v.is_integer() else v for k, v in sorted(production.items())}
    if planetary:
        record['planetary'] = True
    if surface:
        record['surfaceStrategic'] = sorted(surface)
    if surface_production:
        record['surfaceYield'] = dict(sorted(surface_production.items()))
    return record


def arc_furnace_branches(entries, variables, resources):
    """Resolve mutually named production rules for systems with an Arc Furnace."""
    branches = {}
    for name, production in entries:
        if name != 'resources':
            continue
        for key, block in production:
            if key != 'produces':
                continue
            trigger = next((v for k, v in block if k == 'trigger'), None)
            if not isinstance(trigger, list) or len(trigger) != 1:
                return {}
            condition, enabled = trigger[0]
            if not condition.startswith('arc_furnace_overclock_') or enabled != 'yes':
                return {}
            quantities = {}
            for resource, variable in block:
                if resource == 'trigger':
                    continue
                if resource not in resources or not isinstance(variable, str):
                    return {}
                amount = variables.get(variable, variable)
                if not re.fullmatch(r'\d+(?:\.\d+)?', amount):
                    return {}
                quantities[resource] = float(amount) if '.' in amount else int(amount)
            branches[condition.removeprefix('arc_furnace_overclock_')] = quantities
    return branches


def translations(game, language, definition_keys):
    source = {}
    selected = set(definition_keys)
    directory = game / 'localisation' / language
    for path in sorted(directory.rglob('*.yml')):
        family = path.stem.removesuffix(f'_l_{language}')
        name_file = family in NAME_FILES
        for line in path.read_text(encoding='utf-8-sig').splitlines():
            match = LOC.match(line)
            if not match:
                continue
            key, value = match.groups()
            source[key] = value.replace(r'\"', '"')
            if (name_file or key.startswith(('NAME_', 'STAR_NAME_')) or
                    re.fullmatch(r'NEW_COLONY_NAME_\d+', key) or
                    (key.startswith(('EMPIRE_DESIGN_', 'PRESCRIPTED_')) and not key.isupper()) or
                    (path.parent.name == 'name_lists' and '_PLANET_' in key) or
                    (key.startswith('SPEC_') and key.endswith('_system'))):
                if not key.lower().endswith(('_desc', '_bio')):
                    selected.add(key)

    def resolve(key, seen):
        value = source[key]
        def replace(match):
            other = match[1]
            if other in source and other not in seen and other.lower() not in NAME_VARIABLES:
                return resolve(other, seen | {other})
            return match[0]
        return re.sub(r'§.', '', REFERENCE.sub(replace, value))

    return {key: resolve(key, {key}) for key in selected if key in source}


def build(game):
    common = game / 'common'
    classes = dict(definitions(common, 'planet_classes'))
    resources = dict(definitions(common, 'strategic_resources'))
    important_categories = {key for key, block in definitions(common, 'deposit_categories')
                            if scalar(block, 'important') == 'yes'}
    strategic = sorted(k for k, data in resources.items() if scalar(data, 'category') in {'strategic', 'rare'})
    variables = {}
    for path in sorted((common / 'scripted_variables').glob('*.txt')):
        variables.update(re.findall(r'^[ \t]*(@\w+)[ \t]*=[ \t]*(-?\d+(?:\.\d+)?)[ \t]*(?:#[^\n]*)?$',
                                    path.read_text(encoding='utf-8-sig'), re.MULTILINE))
    deposits = {}
    for path in sorted((common / 'deposits').glob('*.txt')):
        entries = read_script(path)
        local_vars = variables | {k: v for k, v in entries if k.startswith('@') and isinstance(v, str)}
        for key, data in entries:
            if not isinstance(data, list):
                continue
            deposits[key] = deposit_data(data, resources, strategic, important_categories, local_vars)
            if key in {'d_arc_furnace_3', 'd_arc_furnace_4'}:
                branches = arc_furnace_branches(data, local_vars, resources)
                if branches:
                    deposits[key]['branches'] = branches
    keys = set(classes) | set(resources) | set(deposits)
    # Include relic names in the map's curated reward notes.
    highlights = Path(__file__).resolve().parents[1] / 'web' / 'highlights.js'
    keys.update(re.findall(r'\brelic:\s*"(r_\w+)"', highlights.read_text(encoding='utf-8')))
    for folder in ('archaeological_site_types', 'anomalies', 'megastructures', 'star_classes'):
        for path in (common / folder).glob('*.txt'):
            keys.update(DEFINITION.findall(path.read_text(encoding='utf-8-sig')))
    keys.update(f'precursor_{n}' for n in range(1, 6))
    keys.update(('precursor_baol_1', 'precursor_zroni_1', 'precursor_inetian', 'precursor_adakkaria',
                 'toxic_terraforming_candidate', 'ASTEROID_NAME_FORMAT', 'AofB', 'AassocB', 'TWO_NAMES_FORMAT',
                 'terraforming_candidate', 'PLANET_NAME_FORMAT', 'SUBPLANET_NAME_FORMAT',
                 'NEW_COLONY_NAME_1', 'NEW_COLONY_NAME_2'))
    english = translations(game, 'english', keys)
    chinese = translations(game, 'simp_chinese', keys)
    names = {k: [english.get(k, chinese.get(k)), chinese.get(k, english.get(k))]
             for k in sorted(english.keys() | chinese.keys())}
    version = json.loads((game / 'launcher-settings.json').read_text(encoding='utf-8-sig'))['version']
    return {
        'version': version, 'names': names,
        'colonizable': sorted(k for k, data in classes.items() if scalar(data, 'colonizable') == 'yes'),
        'strategic': strategic, 'deposits': dict(sorted(deposits.items())),
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('game', type=Path, help='Stellaris installation directory')
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1] / 'web' / 'catalog.json')
    args = parser.parse_args()
    catalog = build(args.game)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(catalog, ensure_ascii=False, separators=(',', ':')) + '\n',
                           encoding='utf-8', newline='\n')
    print(f"{catalog['version']}: {len(catalog['names'])} names, {len(catalog['deposits'])} deposit types")
