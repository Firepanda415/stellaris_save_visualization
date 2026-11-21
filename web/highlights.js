// Keys come from system initializers, system flags, dig sites and anomaly categories.
// Rewards describe an event branch. A marker can outlive its reward.
const rubricatorReward = {
  relic: "r_rubricator",
  title: { zh: "事件 · 誊录仪（飞天鼠盗）", en: "Event · The Rubricator (Kleptomaniac Rats)" },
  zh: "发掘遗落星球上的遗址会唤醒裂爪龙。击败它可取得誊录仪，激活一次可获得 2,000 稀有文物。",
  en: "Excavating the relic world awakens Shard. Defeating the dragon can earn the Rubricator, which grants 2,000 Minor Artifacts per activation.",
  source: "events/ancient_relics_arcsite_events_1.txt (ancrel.4020), common/relics/relics.txt (r_rubricator)"
};

const wenkwortReward = {
  title: { zh: "异常 · 行星花园（温科沃特）", en: "Anomaly · Planetscape Garden (Wenkwort)" },
  zh: "温科沃特的盖亚星球自带研究人员产出 +10%。同意监管者的保护条件可再加 20%，代价是当地工匠产出 −30%、矿工和精炼师产出 −70%。",
  en: "Wenkwort's Gaia world starts with +10% researcher output. Accepting custodianship adds another 20% but cuts local artisan output by 30% and miner and refiner output by 70%.",
  source: "events/federations_events_3.txt (federations3.125), common/static_modifiers/11_static_modifiers_federations.txt (pm_wenkwort_gardens, pm_wenkwort_custodian)"
};

const highlights = {
  vultaumar_system: {
    relic: "r_reality_perforator",
    home: true,
    title: { zh: "先驱者母星 · 沃陶姆（沃陶穆尔）", en: "Precursor homeworld · Vultaum (Vultaumar)" },
    zh: "完成沃陶姆母星调查可获得凝聚力和三类研究点数。启用 Ancient Relics 时还可取得沃陶姆现实透孔仪，将人口舒适度消耗降低 10%。",
    en: "Finishing the Vultaum homeworld survey awards Unity and research in all three fields. With Ancient Relics, it also awards the Reality Perforator, which reduces pop amenities use by 10%.",
    source: "events/precursor_events.txt (precursor.101), common/relics/relics.txt (r_reality_perforator)"
  },
  yuhtaan_system: {
    relic: "r_cryo_core",
    home: true,
    title: { zh: "先驱者母星 · 尤特（尤特安）", en: "Precursor homeworld · Yuht (Yuhtaan)" },
    zh: "完成尤特母星调查后，启用 Ancient Relics 的帝国可取得尤特冷冻核心。持有它可使能量武器射速提高 20%。",
    en: "Completing the Yuht homeworld survey with Ancient Relics can award the Yuht Cryo Core. It increases energy weapon fire rate by 20%.",
    source: "events/precursor_events.txt (precursor.601), common/relics/relics.txt (r_cryo_core)"
  },
  fen_habbanis_system: {
    home: true,
    title: { zh: "先驱者首都 · 第一联盟总部（哈本尼斯之泽）", en: "Precursor capital · First League Headquarters (Fen Habbanis)" },
    zh: "第一联盟的故都生成时是一颗 25 格遗落星球。完成母星调查可获得凝聚力、社会学研究点数和影响力。",
    en: "The First League capital starts as a size 25 relic world. Completing the homeworld survey awards Unity, Society research and Influence.",
    source: "common/solar_system_initializers/prescripted_species_systems.txt (fen_habbanis_system), events/precursor_events.txt (precursor.1101)"
  },
  irass_system: {
    relic: "r_pox_sample",
    home: true,
    title: { zh: "先驱者母星 · 伊拉斯人（伊拉斯）", en: "Precursor homeworld · Irassians (Irass)" },
    zh: "完成伊拉斯母星调查后，启用 Ancient Relics 的帝国可取得贾沃疹样本。持有它可使领袖寿命延长 20 年。",
    en: "Completing the Irassian homeworld survey with Ancient Relics can award the Javorian Pox Sample. It adds 20 years to leader lifespan.",
    source: "events/precursor_events.txt (precursor.1601), common/relics/relics.txt (r_pox_sample)"
  },
  cybrex_system: {
    relic: "r_war_forge",
    home: true,
    title: { zh: "先驱者母星 · 赛博勒克斯中枢节点（赛博勒克斯-阿尔法）", en: "Precursor home system · Cybrex Central Nexus (Cybrex Alpha)" },
    zh: "完成赛博勒克斯母星调查后，启用 Ancient Relics 的帝国可取得赛博勒克斯兵工厂。每次激活消耗凝聚力，并按 2 矿物换 1 合金的比例进行转化。",
    en: "Completing the Cybrex homeworld survey with Ancient Relics can award the Cybrex War Forge. Each activation costs Unity and converts two Minerals into one Alloy.",
    source: "events/precursor_events.txt (precursor.2101), common/relics/relics.txt (r_war_forge)"
  },
  precursor_baol_1: {
    title: { zh: "先驱者线索区 · 巴奥", en: "Precursor clue region · Baol" },
    zh: "巴奥线索区域。调查尚无异常和考古点的固态天体，有机会发现古茹努尔遗址，开启巴奥事件链。",
    en: "Baol clue region. Surveying a suitable solid body with no anomaly or dig site can reveal the Grunur ruins and start the Baol chain.",
    source: "events/ancient_relics_arcsite_events_1.txt (ancrel.2000)"
  },
  last_baol_system: {
    relic: "r_the_last_baol",
    title: { zh: "先驱者终点 · 最后的巴奥（古茹努尔）", en: "Precursor destination · The Last Baol (Grunur)" },
    zh: "找到最后的巴奥，完成对话即可取得同名遗珍。激活后可在一颗符合条件的殖民地实施决议，将它改造为盖亚星球。",
    en: "Find the Last Baol and complete the dialogue to obtain the relic. Activating it unlocks a decision to turn one eligible colony into a Gaia world.",
    source: "events/ancient_relics_arcsite_events_1.txt (ancrel.2022, ancrel.2023), common/decisions/05_ancient_relics_decisions.txt (decision_baol_life_seed)"
  },
  precursor_zroni_1: {
    title: { zh: "先驱者线索区 · 泽珞族", en: "Precursor clue region · Zroni" },
    zh: "泽珞族线索区域。优先调查尚未殖民的宜居星球。没有异常或考古点的星球有机会出现第一处泽珞族遗址。",
    en: "Zroni clue region. Prioritize uncolonized habitable planets. A world with no anomaly or existing dig site can reveal the first Zroni excavation.",
    source: "events/ancient_relics_arcsite_events_1.txt (ancrel.1)"
  },
  Zrocursor_system: {
    relic: "r_zro_crystal",
    home: true,
    title: { zh: "先驱者母星 · 泽珞族（泽珞星）", en: "Precursor homeworld · Zroni (Zron)" },
    zh: "完成泽珞族母星上的最终发掘可取得灵能档案，使进入虚境的冷却时间缩短 50%。",
    en: "Completing the final excavation on the Zroni homeworld awards the Psionic Archive, which halves the cooldown for entering the Shroud.",
    source: "events/ancient_relics_arcsite_events_1.txt (ancrel.19), common/relics/relics.txt (r_zro_crystal)"
  },
  precursor_inetian: {
    title: { zh: "先驱者线索区 · 因内特贸易体", en: "Precursor clue region · Inetian Traders" },
    zh: "因内特贸易体线索区域。调查荒芜星球或冰冷的荒芜星球，有机会发现古代风暴避难所的线索。",
    en: "Inetian Traders clue region. Surveying a barren or cold barren world can reveal evidence of ancient storm shelters.",
    source: "events/precursor_events_cosmic_storms.txt (cstorms.100, cstorms.105)"
  },
  weathermanipulators_home_system: {
    title: { zh: "先驱者中途线索 · 追踪贸易体（因内特贸易体）", en: "Precursor lead · Tracing the Traders (Inetian Traders)" },
    zh: "因内特贸易体的三个考古点分别位于居住星球、工业星球和荒芜星球。调查这些坐标能推进寻找最终避难所的事件链。",
    en: "Three Inetian dig sites lie on the residential, industrial and barren worlds in this system. Investigating the coordinates advances the search for the last shelter.",
    source: "common/solar_system_initializers/cosmic_storm_initializers.txt (weathermanipulators_home_system), events/precursor_events_cosmic_storms.txt (cstorms.186)"
  },
  site_weathermanipulators_last_shelter: {
    relic: "r_weather_manipulator",
    title: { zh: "先驱者最终遗址 · 末日前夕（因内特贸易体）", en: "Final precursor dig · Before the Fall (Inetian Traders)" },
    zh: "完成最后一座风暴避难所的发掘，可获得社会学研究点数和扰动抑制器。持有该遗珍使帝国物理学研究产出提高 15%。",
    en: "Finishing the last storm shelter excavation awards Society research and the Disturbance Oppressor. The relic raises empire Physics research output by 15%.",
    source: "events/precursor_events_cosmic_storms.txt (cstorms.193), common/relics/relics.txt (r_weather_manipulator)"
  },
  precursor_adakkaria: {
    title: { zh: "先驱者线索区 · 阿达卡利亚", en: "Precursor clue region · adAkkaria" },
    zh: "阿达卡利亚线索区域。可以从没有异常或考古点的荒芜星球着手调查，寻找开启事件链的信号。",
    en: "adAkkaria clue region. Start the search for the first signal by surveying barren worlds without an anomaly or dig site.",
    source: "events/precursor_events_cosmic_storms.txt (cstorms.200, cstorms.205)"
  },
  adSalivul_system: {
    title: { zh: "先驱者中途线索 · 远古居住站（艾德萨利伏尔）", en: "Precursor lead · The Ancient Habitat (adSalivul)" },
    zh: "艾德萨利伏尔是阿达卡利亚的中途线索。在崩坏星球上完成特殊项目可揭示崇高仁善协会遗址，继续追查其首都。",
    en: "adSalivul is an intermediate adAkkaria destination. Complete the special project on the broken world to reveal the Institute of Exalted Benevolence and pursue the capital.",
    source: "events/precursor_events_cosmic_storms.txt (cstorms.2185)"
  },
  site_adakkaria_the_patriotic_institute: {
    title: { zh: "考古点 · 崇高仁善协会", en: "Dig site · Institute of Exalted Benevolence" },
    zh: "发掘完成 15 天后，艾德苏尔星系出现。定居帝国获得下一级轨道居住站科技的 25% 研究进度。游牧帝国和已掌握全部三级科技的帝国获得工程学研究点数。",
    en: "The adSul system appears 15 days after excavation. Settled empires gain 25% progress toward their next habitat technology. Nomadic empires and those with all three habitat technologies gain Engineering research instead.",
    source: "events/precursor_events_cosmic_storms.txt (cstorms.2225, cstorms.2230)"
  },
  adSul_system: {
    relic: "r_the_tempest_invocator",
    home: true,
    title: { zh: "先驱者首都 · 庆典学院（艾德苏尔）", en: "Precursor capital · Celebration (adSul)" },
    zh: "在艾德苏尔首都完成庆典遗址发掘后，可以选择索取风暴召唤器。持有它使凝聚力产出提高 10%，舰船维护费降低 15%。",
    en: "After excavating the celebration site on the adSul capital, choose to claim the Tempest Invocator. It raises Unity output by 10% and cuts ship upkeep by 15%.",
    source: "events/precursor_events_cosmic_storms.txt (cstorms.2270, cstorms.2335, cstorms.2355), common/relics/relics.txt (r_the_tempest_invocator)"
  },
  paragon_legendary_leader_homeworld: {
    title: { zh: "考古点 · 瓦格罗人废墟", en: "Dig site · Vagrosian Ruins" },
    zh: "需要凯德斯驾驶科研船发掘。完成后可以让他继续担任科学家，或转任指挥官、行政官。三种选择均给予他 54,000 经验和“远祖流传”特质。",
    en: "Keides must lead the science ship. After the dig, he can remain a Scientist or become a Commander or Official. Each choice grants him 54,000 experience and the Ancestral Inheritance trait.",
    source: "common/archaeological_site_types/08_paragon_arc_sites.txt (paragon_legendary_leader_homeworld), events/paragon_events_3.txt (paragon.3156, paragon.3160)"
  },
  omnirelic_site: {
    relic: "r_omnicodex",
    title: { zh: "考古点 · 废弃星球（有机全典）", en: "Dig site · Ruined World (Omnicodex)" },
    zh: "完成发掘可取得有机全典，生物物种可用的特质点数增加 1 点。",
    en: "Completing this excavation awards the Omnicodex, which adds one trait point for biological species.",
    source: "events/ancient_relics_arcsite_events_1.txt (ancrel.24), common/relics/relics.txt (r_omnicodex)"
  },
  site_debris_belt: {
    relic: "r_odryskan_crystal",
    title: { zh: "考古点 · 碎片环带（奥得律斯基亚水晶）", en: "Dig site · Debris Belt (Crystal of Odryskia)" },
    zh: "完成发掘可取得奥得律斯基亚水晶。帝国稀有水晶产出提高 15%，激活时还可获得能量币。",
    en: "Completing the dig awards the Crystal of Odryskia. It raises empire Rare Crystal production by 15% and grants Energy Credits on activation.",
    source: "events/arcsite_events.txt (arcsite.2520), common/relics/relics.txt (r_odryskan_crystal)"
  },
  site_zarqlan: {
    relic: "r_severed_head",
    title: { zh: "考古点 · 古墓（扎克兰的头颅）", en: "Dig site · Ancient Tomb (Head of Zarqlan)" },
    zh: "完成发掘可取得扎克兰的头颅。它允许定居帝国殖民圣地星球，也允许游牧帝国在圣地守护者境内建造中途站。",
    en: "Completing the dig awards the Head of Zarqlan. Settled empires can colonize Holy Worlds. Nomadic empires can build Waystations in Holy Guardian space.",
    source: "events/ancient_relics_arcsite_events_2.txt (ancrel.6125), common/relics/relics.txt (r_severed_head)"
  },
  site_fumongus_dig: {
    title: { zh: "考古点 · 脱水", en: "Dig site · Desiccated" },
    zh: "在保全菌丝网络的结局中，帝国可永久获得 +1 破译能力。",
    en: "The ending that preserves the mycelial network can give your empire a permanent +1 Codebreaking.",
    source: "events/ancient_relics_arcsite_events_2.txt (ancrel.13135), common/static_modifiers/02_static_modifiers.txt (mycelial_network_modifier)"
  },
  disco_speed_demon_cat: {
    title: { zh: "异常 · 轨道高速妖（外星盒子）", en: "Anomaly · Orbital Speed Demon (Alien Box)" },
    zh: "打开外星盒子可以改造物种。绿色药剂使宜居性下限提高 30 个百分点，红色使住房消耗降低 5%，蓝色使领袖寿命延长 10%。",
    en: "Opening the alien box can modify your species. Green raises the habitability floor by 30 percentage points, red cuts housing use by 5%, and blue extends leader lifespan by 10%.",
    source: "events/distant_stars_events_2.txt (distar.3057), common/traits/04_species_traits.txt (trait_bioadaptability, trait_social_pheromones, trait_limited_regeneration)"
  },
  site_tiyanki_graveyard: {
    title: { zh: "考古点 · 缇扬奇乱坟岗", en: "Dig site · Tiyanki Grave Mound" },
    zh: "核心完好时，可以研究它以获得社会学研究点数。已与策展人接洽的帝国也可以将它卖出，获得 5,000 能量币。若挖坏核心，社会学研究奖励会减少。",
    en: "An intact core can be studied for Society research or sold for 5,000 Energy Credits if you have met the Curators. A damaged core yields a smaller Society research reward.",
    source: "events/ancient_relics_arcsite_events_2.txt (ancrel.14500, ancrel.14510, ancrel.14520)"
  },
  site_lost_moments: {
    title: { zh: "考古点 · 永不遗忘", en: "Dig site · Never Forget" },
    zh: "完成发掘后，帝国人口幸福度永久提高 5 个百分点。",
    en: "Completing the dig permanently raises empire-wide pop happiness by 5 percentage points.",
    source: "events/federations_events_1.txt (fedev.9440), common/static_modifiers/11_static_modifiers_federations.txt (lost_moment_memento)"
  },
  site_ancient_robot_world: {
    title: { zh: "考古点 · 远古机器人星球", en: "Dig site · Ancient Robot World" },
    zh: "保留监视设施可直接获得一座完整的哨兵阵列。机械智能也可接管当地，将其变为机械星球。接管、迁走机器人或拆解设施等其他选择各有 50% 概率使终末危机从终局起始年份起就有机会触发。",
    en: "Keeping the surveillance facility gives you a completed Sentry Array. A Machine Intelligence can instead claim a Machine World. Taking over the planet, relocating the robots or dismantling the facility each has a 50% chance to allow the crisis roll from the endgame start year.",
    source: "events/ancient_relics_arcsite_events_2.txt (ancrel.12090, ancrel.12095), events/crisis_trigger_events.txt (crisis_trigger.1)"
  },
  site_polaris_seed_vault: {
    title: { zh: "考古点 · 最后的希望", en: "Dig site · One Last Hope" },
    zh: "种子与微生物样本各有 50% 概率。种子使帝国生物学研究速度永久提高 10%。微生物样本可推进殖民科技，机械智能则获得社会学研究点数。该结局还对应 Grand Archive 标本“勾陈一庇护所”。启用 Ancient Relics 时，两种结局都可获得 300、400 或 500 稀有文物。",
    en: "Seeds and microbes each have a 50% chance. Seeds permanently increase Biology research speed by 10%. Microbes can advance a colonization technology, or award Society research to a Machine Intelligence. The microbe outcome also features the Vault of Polaris specimen with Grand Archive. With Ancient Relics, either outcome also grants 300, 400 or 500 Minor Artifacts.",
    source: "events/ancient_relics_arcsite_events_2.txt (ancrel.13006, ancrel.13020, ancrel.13025), common/static_modifiers/10_static_modifiers_ancient_relics.txt (polaris_biology_modifier), common/scripted_effects/archaeology_event_effects.txt (medium_artifact_reward), common/specimens/specimens.txt (vault_of_polaris)"
  },
  larion_digsite: {
    title: { zh: "考古点 · 信号", en: "Dig site · The Signal" },
    zh: "非排外且非灭绝性的帝国可以唤醒拉里昂内斯。把它们安置在首都可永久提高当地舒适度、建筑建造速度和岗位食物产出，各 +10%。若拥有当地恒星基地，也可把星系交给它们，建立蜂巢附庸。",
    en: "Empires that are neither xenophobic nor genocidal can awaken the Larionessi. Giving them a home on your capital permanently adds 10% to local amenities, building construction speed and food from jobs. If you own the system’s starbase, you can instead grant them the system as a hive vassal.",
    source: "events/unique_system_events.txt (unique.10, unique.15, unique.20), common/static_modifiers/16_static_modifiers_overlord.txt (larionessi_planet_modifier)"
  },
  zevox_digsite: {
    title: { zh: "考古点 · 坠毁的飞船", en: "Dig site · The Crashed Ship" },
    zh: "可直接领取社会学研究点数。除铁心灭绝者外，机械智能也可接受抟土之塑师的考验。通过考验会生成盖亚星球。失败时，部分人口会脱离集体，在那里建立独立帝国。",
    en: "You can take Society research. A Machine Intelligence other than a Determined Exterminator can instead accept the Animator of Clay’s test. Success creates a Gaia World. Failure gives the Gaia World to a new independent empire and can cost you pops.",
    source: "events/unique_system_events.txt (unique.65, unique.70, unique.80, unique.85, unique.90)"
  },
  site_the_chosen_backstory: {
    title: { zh: "考古点 · 废弃观测站", en: "Dig site · Abandoned Observation Outpost" },
    zh: "非灭绝性帝国可选择“立起护盾”项目，完成后凝聚力产出提高 10%，观测站产出提高 50%。若目标星球已归自己所有或尚未殖民，结局改为舰船武器伤害 +5% 和军国主义思潮吸引力 +15%，格式塔帝国则获得舰船武器伤害 +10%。",
    en: "Non-genocidal empires can choose the Erect the Shield project. Completing it grants +10% Unity output and +50% observation post output. If you own the target world or it is uncolonized, the ending instead grants +5% ship weapon damage and +15% Militarist ethics attraction. Gestalts receive +10% ship weapon damage.",
    source: "events/arcsite_events.txt (arcsite.3015, arcsite.3020), common/special_projects/00_projects_first_contact_dlc.txt (SHIELD_PRIMITIVE_PLANET_PROJECT), common/static_modifiers/18_static_modifiers_first_contact_dlc.txt (bane_of_the_prophetess, charynoi_redemption)"
  },
  last_thought_site: {
    title: { zh: "考古点 · 最后思绪", en: "Dig site · The Last Thought" },
    zh: "完成第四阶段可获得相当于 18 个月产出的社会学研究点数（1,000 至 100,000）。若“原始的思维”仍存在，它将对发掘者怀有敌意。拥有“巨兽之怒”可额外获得 3,000 野性洞见，启用 Ancient Relics 还可获得 750、1,000 或 1,500 稀有文物。",
    en: "Finish the fourth stage to gain 18 months of Society research (1,000 to 100,000). If the Primal Mind still exists, it becomes hostile to the excavating empire. Behemoth Fury adds 3,000 Feral Insight. Ancient Relics also awards 750, 1,000 or 1,500 Minor Artifacts.",
    source: "common/archaeological_site_types/13_biogenesis_arc_sites.txt (last_thought_site), events/biogenesis_events.txt (bio.3465), common/scripted_effects/archaeology_event_effects.txt (large_artifact_reward), common/solar_system_initializers/fallen_empire_initializers.txt (NAME_Primal_Mind)"
  },
  rubricator_system: rubricatorReward,
  rubricator_digsite: rubricatorReward,
  wenkwort_initializer: wenkwortReward,
  WENKWORT_CAT: wenkwortReward
};

highlights.zroni_digsite_6 = highlights.Zrocursor_system;
highlights.site_adakkaria_celebration = highlights.adSul_system;

const precursorRegions = [
  ["precursor_1", "沃陶姆", "Vultaum", "precursor.1"],
  ["precursor_2", "尤特", "Yuht", "precursor.500"],
  ["precursor_3", "第一联盟", "First League", "precursor.1000"],
  ["precursor_4", "伊拉斯人", "Irassian", "precursor.1500"],
  ["precursor_5", "赛博勒克斯", "Cybrex", "precursor.2000"]
];

for (const [key, chinese, english, event] of precursorRegions) {
  highlights[key] = {
    title: { zh: `先驱者线索区 · ${chinese}`, en: `Precursor clue region · ${english}` },
    zh: `这里属于${chinese}线索区域。如果还没有开始先驱者事件链，调查这里的天体有机会找到首条线索。母星系会在事件链后期生成。`,
    en: `This system lies in the ${english} clue region. If you have yet to begin a precursor chain, surveying here can reveal the first clue. The home system appears later in the chain.`,
    source: `events/precursor_events.txt (${event})`
  };
}

globalThis.HIGHLIGHTS = highlights;
