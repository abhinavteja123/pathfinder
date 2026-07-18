import type { EngineNode } from './types';

/**
 * Compact but real per-stage graphs for the four year-stages (Discover/Build/
 * Convert/Launch), each with a "continue" path (has history) and a "catchup"
 * path (first contact at that year). Copy is intentionally light -- this is
 * architecture scaffolding, not final content.
 */
export const NODES: Record<string, EngineNode> = {
  // ---- Y1: Discover ----
  // Flow (branch-flow chart): greet (branch fetched at login as answers.branch,
  // never asked in chat) -> hobbies -> dream/goal -> career path menu
  // (enterprise/job/startup) -> expected package menu (below/above 50 LPA)
  // -> hard-work real-talk -> domain menu (options vary by branch) -> one
  // domain follow-up -> roadmap intro (branch-toned: CSE = LeetCode/GitHub
  // profile; ECE/EEE = VLSI certs + college courses; Civil/Mech = their own
  // certs) -> transition (client fires the profile-building explainer batch
  // here, see PathfinderChat) -> wrapup (roadmap + memory promise).
  discover_intro: {
    id: 'discover_intro',
    kind: 'fixed',
    say: "Hi! I'm Pathfinder -- your companion here. Good to meet you!",
    // Branch comes from the login-time student-details fetch (seeded as
    // answers.branch) -- greeting proves the bot already knows them.
    sayByAnswer: {
      key: 'branch',
      fallback: "Hi! I'm Pathfinder -- your companion here. Good to meet you!",
      map: {
        CSE: "Hi! I'm Pathfinder. I already pulled your details -- CSE, nice! You're sitting right in the middle of the tech world. Let's figure out where YOU fit in it.",
        ECE: "Hi! I'm Pathfinder. I checked your details -- ECE! Chips, circuits and signals run the world, and I've got a plan shaped just for your branch.",
        Civil: "Hi! I'm Pathfinder. Your details say Civil -- the people who literally build the world. Let's build your career the same way, brick by brick.",
        EEE: "Hi! I'm Pathfinder. I see you're EEE -- power, machines, control systems. Big field, big opportunities. Let's map yours out.",
        Mechanical: "Hi! I'm Pathfinder. Details say Mechanical -- the OG engineering branch. Design, robotics, manufacturing... lots of doors. Let's find yours.",
      },
    },
    options: [{ label: "Let's go", next: 'discover_hobbies' }],
    gesture: 'wave',
    arm: 'right',
  },
  discover_hobbies: {
    id: 'discover_hobbies',
    kind: 'llm',
    systemPrompt:
      'You are Pathfinder, a warm, curious campus companion bot talking to a 1st-year student. Ask casually what they like doing for fun outside of academics -- hobbies, interests -- not a form question. Keep it to 1-2 sentences.',
    captureAs: 'hobbies',
    next: 'discover_goal',
  },
  discover_goal: {
    id: 'discover_goal',
    kind: 'llm',
    systemPrompt:
      "You are Pathfinder, a warm, curious campus companion bot talking to a 1st-year student. Ask an open, creative question about what their goal or dream feels like right now -- not a form question. Keep it to 1-2 sentences.",
    captureAs: 'goal',
    next: 'discover_path',
  },
  // Career-direction menu from the flow chart: enterprise vs job vs startup.
  discover_path: {
    id: 'discover_path',
    kind: 'fixed',
    say: 'Love that. So when you picture yourself after college -- which of these feels most like you?',
    options: [
      { label: 'Big enterprise (FAANG-style)', next: 'discover_package' },
      { label: 'Solid job, good growth', next: 'discover_package' },
      { label: 'My own startup', next: 'discover_package' },
    ],
    captureAs: 'career_path',
  },
  // Expected-package menu. Labels are used verbatim as answers.package_goal --
  // discover_hardwork's sayByAnswer map keys must match these exactly.
  discover_package: {
    id: 'discover_package',
    kind: 'fixed',
    say: 'Okay, honest question -- what package are you dreaming of?',
    sayByAnswer: {
      key: 'career_path',
      fallback: 'Okay, honest question -- what package are you dreaming of?',
      map: {
        'Big enterprise (FAANG-style)': "Big league, I like it. Honest question then -- what's the package you're dreaming of?",
        'Solid job, good growth': "Respect -- stability plus growth is a real strategy. So what package are you aiming at?",
        'My own startup': "Founder energy! Even founders benchmark themselves though -- what income level are you aiming for?",
      },
    },
    options: [
      { label: 'Below 50 LPA', next: 'discover_hardwork' },
      { label: 'Above 50 LPA', next: 'discover_hardwork' },
    ],
    captureAs: 'package_goal',
  },
  // The "do you know you have to work hard for that" real-talk beat.
  discover_hardwork: {
    id: 'discover_hardwork',
    kind: 'fixed',
    say: "Then let's be real with each other -- goals like that don't happen by attending classes alone.",
    sayByAnswer: {
      key: 'package_goal',
      fallback: "Then let's be real with each other -- goals like that don't happen by attending classes alone.",
      map: {
        'Above 50 LPA': "50+ LPA -- I won't sugarcoat it: that's top 1% territory. It means consistent daily practice, real projects, and showing up even when it's boring. The good news? Starting in year 1, you have TIME on your side. Ready to hear how?",
        'Below 50 LPA': "Totally achievable -- but 'achievable' still means real, consistent work: skills, projects, practice. Most people underestimate that part. The good news is you're starting early, and that's the biggest advantage there is. Want the plan?",
      },
    },
    options: [
      { label: "I'm ready 💪", next: 'discover_domain' },
      { label: 'Show me how', next: 'discover_domain' },
    ],
    captureAs: 'hardwork_ack',
    // Real-talk beat gets the "stop" pose -- the robot holds a hand up while
    // delivering the work-hard truth, so the moment lands visually too.
    gesture: 'stop',
    arm: 'right',
  },
  discover_domain: {
    id: 'discover_domain',
    kind: 'fixed',
    say: 'Cool. Which field are you most into right now?',
    options: [
      { label: 'AI/ML', next: 'discover_domain_q1' },
      { label: 'Cybersecurity', next: 'discover_domain_q1' },
      { label: 'IoT', next: 'discover_domain_q1' },
      { label: 'ECE', next: 'discover_domain_q1' },
      { label: 'EEE', next: 'discover_domain_q1' },
      { label: 'Web Dev', next: 'discover_domain_q1' },
      { label: 'Cloud/DevOps', next: 'discover_domain_q1' },
      { label: 'Mobile Dev', next: 'discover_domain_q1' },
      { label: 'Blockchain', next: 'discover_domain_q1' },
      { label: 'Data Science', next: 'discover_domain_q1' },
    ],
    // BBA students get business-flavored domains instead of the BTech menu --
    // same node, same downstream flow, resolved per program in fsm.ts.
    optionsByProgram: {
      BBA: [
        { label: 'Marketing', next: 'discover_domain_q1' },
        { label: 'Finance', next: 'discover_domain_q1' },
        { label: 'HR', next: 'discover_domain_q1' },
        { label: 'Operations', next: 'discover_domain_q1' },
        { label: 'Business Analytics', next: 'discover_domain_q1' },
      ],
    },
    // Non-CSE engineering branches get their own specialization menus (branch
    // fetched at login, resolved branch-first in fsm.ts nodeOptions). CSE keeps
    // the default 10-option list above. Labels must match DOMAIN_CATALOG keys
    // in roadmap.ts verbatim -- that's the roadmap lookup key.
    optionsByBranch: {
      ECE: [
        { label: 'VLSI Design', next: 'discover_domain_q1' },
        { label: 'Embedded Systems', next: 'discover_domain_q1' },
        { label: 'IoT', next: 'discover_domain_q1' },
        { label: 'Signal Processing', next: 'discover_domain_q1' },
      ],
      EEE: [
        { label: 'Power Systems', next: 'discover_domain_q1' },
        { label: 'Control Systems', next: 'discover_domain_q1' },
        { label: 'Embedded Systems', next: 'discover_domain_q1' },
        { label: 'IoT', next: 'discover_domain_q1' },
      ],
      Civil: [
        { label: 'Structural Design', next: 'discover_domain_q1' },
        { label: 'Construction Management', next: 'discover_domain_q1' },
        { label: 'GIS & Surveying', next: 'discover_domain_q1' },
      ],
      Mechanical: [
        { label: 'CAD & Design', next: 'discover_domain_q1' },
        { label: 'Robotics', next: 'discover_domain_q1' },
        { label: 'Thermal & Energy', next: 'discover_domain_q1' },
        { label: 'Manufacturing & 3D Printing', next: 'discover_domain_q1' },
      ],
    },
    captureAs: 'domain',
  },
  // Scripted, not LLM-generated: the domain menu already gives a deterministic
  // key, so a canned per-domain question costs zero tokens and is just as
  // relevant as an LLM-generated one would be. Cuts 2 of the flow's LLM calls.
  discover_domain_q1: {
    id: 'discover_domain_q1',
    kind: 'fixed',
    say: 'What draws you to that field the most?',
    sayByAnswer: {
      key: 'domain',
      fallback: 'What draws you to that field the most?',
      map: {
        'AI/ML': 'Are you more curious about how AI models actually learn, or more into the cool stuff you can build with them?',
        Cybersecurity: 'Is it the hacker/puzzle-solving side that pulls you in, or more the idea of protecting systems and data?',
        IoT: 'Are you more into the physical gadgets and sensors side, or the idea of connecting everyday things to the internet?',
        ECE: 'Are you more into the hardware/circuits side, or the signal-processing/software side?',
        EEE: 'Are you leaning more toward power systems, or control systems and automation?',
        'Web Dev': 'Frontend, backend, or do you like doing both end to end?',
        'Cloud/DevOps': 'Is it the idea of running apps at massive scale that excites you, or more the automation/DevOps side of things?',
        'Mobile Dev': 'iOS, Android, or cross-platform stuff like Flutter or React Native?',
        Blockchain: 'Is it the decentralization idea that hooks you, or more the tech behind smart contracts and crypto?',
        'Data Science': 'Do you enjoy the analysis and stats side more, or the visualization and storytelling side?',
        Marketing: 'Are you more drawn to the creative side -- brand, content, campaigns -- or the numbers side like growth and analytics?',
        Finance: 'Is it markets and investing that pull you in, or more the corporate side -- valuation, deals, planning?',
        HR: 'Are you more into the people side -- hiring, culture -- or the strategy side like org design and people analytics?',
        Operations: 'Do you like the supply-chain and logistics puzzle, or more the process-improvement and efficiency side?',
        'Business Analytics': 'Do you enjoy digging into data to find the story, or presenting insights that change decisions?',
        'VLSI Design': 'Is it designing the chips themselves that excites you, or verifying they actually work?',
        'Embedded Systems': 'Are you more into programming the tiny brains inside devices, or wiring up the hardware around them?',
        'Signal Processing': 'Audio, images, or communications -- which kind of signal sounds most fun to play with?',
        'Power Systems': 'Grids and renewables, or the machines side -- motors, drives, transformers?',
        'Control Systems': 'Is it automation and PLCs that pull you, or the math of making systems behave?',
        'Structural Design': 'Bridges and towers, or buildings -- what would you love to see standing because of you?',
        'Construction Management': 'Is it running big sites and teams that appeals, or the planning/scheduling puzzle?',
        'GIS & Surveying': 'Maps and drones, or the data side -- turning terrain into decisions?',
        'CAD & Design': 'Product design and modeling, or simulation -- stress-testing things before they exist?',
        Robotics: 'Building the robot body, or programming its brain -- which half grabs you more?',
        'Thermal & Energy': 'Engines and turbines, or the green side -- solar, batteries, sustainable energy?',
        'Manufacturing & 3D Printing': 'Traditional production lines, or the new world of additive manufacturing and 3D printing?',
      },
    },
    captureAs: 'domain_note1',
    next: 'discover_roadmap_intro',
  },
  // NOTE: discover_domain_q2 + the five check-ins below are BYPASSED by the
  // branch-flow redesign (q1 now goes straight to discover_roadmap_intro).
  // Kept as-is (uncommitted work, cheap to re-wire) -- delete once the new
  // flow is confirmed live.
  discover_domain_q2: {
    id: 'discover_domain_q2',
    kind: 'fixed',
    say: "Have you built or tried anything hands-on in that space yet, even something small?",
    captureAs: 'domain_note2',
    next: 'discover_time_budget',
  },
  discover_time_budget: {
    id: 'discover_time_budget',
    kind: 'fixed',
    say: 'Honestly now -- how many hours a week can you actually give this outside classes?',
    options: [
      { label: '<3 hrs/week', next: 'discover_learn_style' },
      { label: '3–7 hrs/week', next: 'discover_learn_style' },
      { label: '8+ hrs/week', next: 'discover_learn_style' },
    ],
    captureAs: 'time_budget',
  },
  discover_learn_style: {
    id: 'discover_learn_style',
    kind: 'fixed',
    say: 'When something new clicks for you, how does it usually happen?',
    options: [
      { label: 'videos', next: 'discover_domain_confidence' },
      { label: 'building', next: 'discover_domain_confidence' },
      { label: 'reading', next: 'discover_domain_confidence' },
    ],
    captureAs: 'learn_style',
  },
  discover_domain_confidence: {
    id: 'discover_domain_confidence',
    kind: 'fixed',
    say: 'How settled do you feel about {answers.domain} -- gut check, no wrong answer.',
    options: [
      { label: 'just exploring', next: 'discover_second_domain' },
      { label: 'fairly sure', next: 'discover_second_domain' },
      { label: 'all-in', next: 'discover_second_domain' },
    ],
    captureAs: 'domain_confidence',
  },
  // Same domain menu as discover_domain (incl. the BBA override) so a second
  // interest can seed exploration items on the roadmap.
  discover_second_domain: {
    id: 'discover_second_domain',
    kind: 'fixed',
    say: 'If you had a free weekend, what other field would you peek at?',
    options: [
      { label: 'AI/ML', next: 'discover_club_intent' },
      { label: 'Cybersecurity', next: 'discover_club_intent' },
      { label: 'IoT', next: 'discover_club_intent' },
      { label: 'ECE', next: 'discover_club_intent' },
      { label: 'EEE', next: 'discover_club_intent' },
      { label: 'Web Dev', next: 'discover_club_intent' },
      { label: 'Cloud/DevOps', next: 'discover_club_intent' },
      { label: 'Mobile Dev', next: 'discover_club_intent' },
      { label: 'Blockchain', next: 'discover_club_intent' },
      { label: 'Data Science', next: 'discover_club_intent' },
    ],
    optionsByProgram: {
      BBA: [
        { label: 'Marketing', next: 'discover_club_intent' },
        { label: 'Finance', next: 'discover_club_intent' },
        { label: 'HR', next: 'discover_club_intent' },
        { label: 'Operations', next: 'discover_club_intent' },
        { label: 'Business Analytics', next: 'discover_club_intent' },
      ],
    },
    captureAs: 'second_domain',
  },
  discover_club_intent: {
    id: 'discover_club_intent',
    kind: 'fixed',
    say: 'Last one -- when you picture yourself getting good at this, are you doing it with people or heads-down?',
    options: [
      { label: 'clubs', next: 'discover_transition' },
      { label: 'competitions', next: 'discover_transition' },
      { label: 'solo building', next: 'discover_transition' },
    ],
    captureAs: 'club_intent',
  },
  // "Let me give you the list -- the perfect roadmap for your goal" beat,
  // toned per branch: CSE = coding profile game; ECE/EEE = VLSI/core certs +
  // college courses matter; Civil/Mech = their industry tools + courses.
  discover_roadmap_intro: {
    id: 'discover_roadmap_intro',
    kind: 'fixed',
    say: "Perfect. Now let me line up the exact list -- a roadmap built around {answers.domain} and your goal.",
    sayByAnswer: {
      key: 'branch',
      fallback: "Perfect. Now let me line up the exact list -- a roadmap built around {answers.domain} and your goal.",
      map: {
        CSE: "Perfect. For CSE the game is clear: a strong coding profile -- LeetCode practice, real projects on GitHub, internships, hackathons. Let me line up the exact roadmap for your {answers.domain} goal.",
        ECE: "Perfect. For ECE, listen carefully: alongside coding basics, VLSI and embedded certifications genuinely matter -- and your college courses (digital design, signals) are NOT just marks, they're your foundation. Let me line up your {answers.domain} roadmap.",
        EEE: "Perfect. For EEE the winning combo is: core certifications (MATLAB, power/control tools), taking your college courses seriously, plus basic coding. Let me line up your {answers.domain} roadmap.",
        Civil: "Perfect. For Civil, the industry looks for tool certifications -- AutoCAD, STAAD Pro -- and strong fundamentals from your college courses. Site exposure counts too. Let me line up your {answers.domain} roadmap.",
        Mechanical: "Perfect. For Mechanical, CAD tool certifications (SolidWorks, Fusion 360), your core college courses, and hands-on projects are what open doors. Let me line up your {answers.domain} roadmap.",
      },
    },
    options: [{ label: 'Show me 🚀', next: 'discover_transition' }],
    gesture: 'thumbsup',
    arm: 'right',
  },
  discover_transition: {
    id: 'discover_transition',
    kind: 'fixed',
    say: "First things first -- your profile. Let me walk you through the places where it gets built: coding practice, your project portfolio, internships, open source and hackathons. Ready?",
    options: [{ label: "Let's go", next: 'discover_wrapup' }],
    gesture: 'wave',
    arm: 'right',
  },
  discover_wrapup: {
    id: 'discover_wrapup',
    kind: 'fixed',
    say: "Here's your roadmap -- your own journey, plus your {answers.domain} track, built just for you. And hey -- we'll meet again soon. I'll remember everything from today, so next time we just pick up right where we left off.",
    terminal: true,
    gesture: 'thumbsup',
    arm: 'right',
  },
  // Returning Y1 student -- a real welcome-back instead of replaying the
  // "Hi! I'm Pathfinder" intro (which made reused ids look like a silent
  // fresh start). Progress-aware like the other *_continue nodes.
  discover_continue: {
    id: 'discover_continue',
    kind: 'fixed',
    say: "Welcome back! {roadmapProgress}Last time we set up your {answers.domain} track. What have you been exploring since?",
    captureAs: 'checkin_note',
    next: 'discover_return_wrapup',
    gesture: 'handshake',
    arm: 'right',
  },
  discover_return_wrapup: {
    id: 'discover_return_wrapup',
    kind: 'fixed',
    say: "Love it. Your roadmap's right where you left it -- keep ticking those steps off, and I'm here whenever you want to go deeper.",
    terminal: true,
    gesture: 'thumbsup',
    arm: 'right',
  },

  // ---- Y2: Build ----
  build_continue: {
    id: 'build_continue',
    kind: 'fixed',
    say: "Welcome back! Last time you told me you were chasing {answers.goal}. {roadmapProgress}How's that been going?",
    next: 'build_activity_check',
    gesture: 'handshake',
    arm: 'right',
  },
  build_activity_check: {
    id: 'build_activity_check',
    kind: 'fixed',
    say: 'What have you been building or trying lately -- any hackathons or side projects worth bragging about?',
    captureAs: 'activity_note',
    next: 'build_skill_check',
  },
  // Y2 stocktake: skills (multi-select), shipped projects, DSA habit, internship
  // intent, and the one thing blocking them -- feeds {momentumBand} + the canned
  // blocker advice on build_wrapup.
  build_skill_check: {
    id: 'build_skill_check',
    kind: 'fixed',
    multi: true,
    say: "Quick skill stocktake -- tick everything you've actually used, not just heard of.",
    options: [
      { label: 'Git', next: 'build_project_count' },
      { label: 'SQL', next: 'build_project_count' },
      { label: 'REST APIs', next: 'build_project_count' },
      { label: 'DSA basics', next: 'build_project_count' },
      { label: 'Linux', next: 'build_project_count' },
      { label: 'Cloud basics', next: 'build_project_count' },
    ],
    optionsByProgram: {
      BBA: [
        { label: 'Excel', next: 'build_project_count' },
        { label: 'SQL', next: 'build_project_count' },
        { label: 'PowerPoint decks', next: 'build_project_count' },
        { label: 'Market research', next: 'build_project_count' },
        { label: 'Financial modeling', next: 'build_project_count' },
      ],
    },
    captureAs: 'skills_have',
    next: 'build_project_count',
  },
  build_project_count: {
    id: 'build_project_count',
    kind: 'fixed',
    say: 'How many projects have you actually finished and could show someone today?',
    options: [
      { label: '0', next: 'build_dsa_status' },
      { label: '1', next: 'build_dsa_status' },
      { label: '2–3', next: 'build_dsa_status' },
      { label: '4+', next: 'build_dsa_status' },
    ],
    captureAs: 'project_count',
  },
  build_dsa_status: {
    id: 'build_dsa_status',
    kind: 'fixed',
    say: 'And problem-solving practice -- DSA, aptitude, that muscle. Where is it at?',
    options: [
      { label: 'not started', next: 'build_internship_intent' },
      { label: 'sometimes', next: 'build_internship_intent' },
      { label: 'daily-ish', next: 'build_internship_intent' },
    ],
    captureAs: 'dsa_status',
  },
  build_internship_intent: {
    id: 'build_internship_intent',
    kind: 'fixed',
    say: 'Thinking about a summer internship this year, or is that still a next-year thing?',
    options: [
      { label: 'yes', next: 'build_blocker' },
      { label: 'unsure', next: 'build_blocker' },
      { label: 'not yet', next: 'build_blocker' },
    ],
    captureAs: 'internship_intent',
  },
  build_blocker: {
    id: 'build_blocker',
    kind: 'fixed',
    say: "Real talk -- what's the biggest thing slowing you down right now?",
    options: [
      { label: 'time', next: 'build_wrapup' },
      { label: 'what to build', next: 'build_wrapup' },
      { label: 'confidence', next: 'build_wrapup' },
      { label: 'coursework', next: 'build_wrapup' },
    ],
    captureAs: 'blocker',
  },
  build_wrapup: {
    id: 'build_wrapup',
    kind: 'fixed',
    say: "Good progress -- you're {momentumBand}. Updating your roadmap with a few internships and hackathons worth trying next.",
    // Canned per-blocker advice, zero LLM calls -- keyed off the build_blocker
    // menu pick. Catchup path never asks it, so the fallback line fires there.
    sayByAnswer: {
      key: 'blocker',
      fallback: "Good progress -- you're {momentumBand}. Updating your roadmap with a few internships and hackathons worth trying next.",
      map: {
        time: "Time's the classic one -- you're {momentumBand}, so I'm loading your roadmap with small wins that fit inside a single free evening.",
        'what to build': "That's the easiest blocker to fix -- you're {momentumBand}, and I'm dropping two concrete project ideas straight onto your roadmap.",
        confidence: "You're {momentumBand} -- that's real evidence, not luck. I'm adding a couple of low-stakes wins to your roadmap to stack proof on your side.",
        coursework: "Fair -- grades matter too. You're {momentumBand}, so I'll keep your roadmap light: one skill and one small build that complement your courses.",
      },
    },
    terminal: true,
    gesture: 'thumbsup',
    arm: 'right',
  },
  build_catchup_intro: {
    id: 'build_catchup_intro',
    kind: 'fixed',
    say: "Hey, first time we're talking -- even though you're already in year 2! Quick catch-up: what are you aiming for?",
    options: [{ label: "Let's go", next: 'build_catchup_goal' }],
    gesture: 'wave',
    arm: 'right',
  },
  build_catchup_goal: {
    id: 'build_catchup_goal',
    kind: 'llm',
    systemPrompt:
      'You are Pathfinder meeting a 2nd-year student for the first time. Ask about their goal in a casual, creative way.',
    captureAs: 'goal',
    next: 'build_catchup_activity',
  },
  build_catchup_activity: {
    id: 'build_catchup_activity',
    kind: 'fixed',
    say: 'So what have you actually gotten your hands on so far this year -- any projects, clubs, hackathons?',
    captureAs: 'interests',
    next: 'build_wrapup',
  },

  // ---- Y3: Convert ----
  convert_continue: {
    id: 'convert_continue',
    kind: 'fixed',
    say: "You're in the thick of it now. Last we spoke you mentioned {answers.goal}. {roadmapProgress}How are internship-to-PPO conversations looking?",
    next: 'convert_ppo_check',
    gesture: 'handshake',
    arm: 'right',
  },
  convert_ppo_check: {
    id: 'convert_ppo_check',
    kind: 'fixed',
    say: "Give me specifics -- any offer talks in progress, or hackathons/case comps you're using to strengthen your case?",
    captureAs: 'conversion_plan',
    next: 'convert_skillgap_grid',
  },
  // Y3 stocktake: hire-ready skills (multi-select), DSA readiness, resume state,
  // referral network, and target company type -- feeds {readinessBand} on
  // convert_wrapup and the crash-sprint items in roadmap.ts.
  convert_skillgap_grid: {
    id: 'convert_skillgap_grid',
    kind: 'fixed',
    multi: true,
    say: "Let's map the gap -- which of these hire-ready skills do you already have? Tick only what's genuinely there.",
    options: [
      { label: 'DSA in one language', next: 'convert_readiness_rate' },
      { label: 'Git + code review flow', next: 'convert_readiness_rate' },
      { label: 'One deployed project', next: 'convert_readiness_rate' },
      { label: 'SQL + databases', next: 'convert_readiness_rate' },
      { label: 'System design basics', next: 'convert_readiness_rate' },
      { label: 'Aptitude practice', next: 'convert_readiness_rate' },
    ],
    optionsByProgram: {
      BBA: [
        { label: 'Advanced Excel', next: 'convert_readiness_rate' },
        { label: 'Case-solving frameworks', next: 'convert_readiness_rate' },
        { label: 'A live market/finance project', next: 'convert_readiness_rate' },
        { label: 'SQL or analytics tool', next: 'convert_readiness_rate' },
        { label: 'Group-discussion practice', next: 'convert_readiness_rate' },
      ],
    },
    captureAs: 'skillgap',
    next: 'convert_readiness_rate',
  },
  // Option labels here and on convert_resume_status / launch_mock_status match
  // fsm.ts readinessBand()'s scoring keys verbatim -- don't rename casually.
  convert_readiness_rate: {
    id: 'convert_readiness_rate',
    kind: 'fixed',
    say: 'Gut check on problem-solving prep -- if an interviewer grilled you tomorrow, how would it go?',
    options: [
      { label: 'strong', next: 'convert_resume_status' },
      { label: 'okay', next: 'convert_resume_status' },
      { label: 'weak', next: 'convert_resume_status' },
    ],
    captureAs: 'readiness_dsa',
  },
  convert_resume_status: {
    id: 'convert_resume_status',
    kind: 'fixed',
    say: 'And the resume -- be honest, where does it stand right now?',
    options: [
      { label: 'recruiter-ready', next: 'convert_referral_net' },
      { label: 'drafted', next: 'convert_referral_net' },
      { label: "doesn't exist", next: 'convert_referral_net' },
    ],
    captureAs: 'resume_status',
  },
  convert_referral_net: {
    id: 'convert_referral_net',
    kind: 'fixed',
    say: 'Referrals quietly decide a lot of offers -- do you have people who could put your name forward?',
    options: [
      { label: 'alumni contacts', next: 'convert_target_type' },
      { label: 'a few', next: 'convert_target_type' },
      { label: 'none yet', next: 'convert_target_type' },
    ],
    captureAs: 'referral_status',
  },
  convert_target_type: {
    id: 'convert_target_type',
    kind: 'fixed',
    say: 'Last one for the map -- what kind of place are you actually aiming for?',
    options: [
      { label: 'product cos', next: 'convert_track' },
      { label: 'startups', next: 'convert_track' },
      { label: 'core', next: 'convert_track' },
      { label: 'consulting', next: 'convert_track' },
      { label: 'govt-PSU', next: 'convert_track' },
    ],
    captureAs: 'target_type',
  },
  convert_track: {
    id: 'convert_track',
    kind: 'fixed',
    say: 'Time to get specific -- which track or specialization are you doubling down on to make yourself hire-ready this year?',
    captureAs: 'specialization',
    next: 'convert_wrapup',
  },
  convert_wrapup: {
    id: 'convert_wrapup',
    kind: 'fixed',
    say: "Solid. Right now you're {readinessBand}. I'm lining up a focused roadmap for converting your {answers.specialization} track into real offers.",
    terminal: true,
    gesture: 'thumbsup',
    arm: 'right',
  },
  convert_catchup_intro: {
    id: 'convert_catchup_intro',
    kind: 'fixed',
    say: "First time meeting -- year 3 already! Let's get you a fast, focused catch-up. What's the goal?",
    options: [{ label: "Let's go", next: 'convert_catchup_goal' }],
    gesture: 'wave',
    arm: 'right',
  },
  convert_catchup_goal: {
    id: 'convert_catchup_goal',
    kind: 'llm',
    systemPrompt:
      'You are Pathfinder meeting a 3rd-year student for the first time. Ask about their goal, conversationally, with an eye toward internship-to-PPO conversion since they are time-pressured.',
    captureAs: 'goal',
    next: 'convert_track',
  },

  // ---- Y4: Launch ----
  launch_continue: {
    id: 'launch_continue',
    kind: 'fixed',
    say: "Final stretch. Looking back at everything -- {answers.goal}, {answers.conversion_plan}. {roadmapProgress}How's the placement season treating you?",
    next: 'launch_offer_check',
    gesture: 'handshake',
    arm: 'right',
  },
  launch_offer_check: {
    id: 'launch_offer_check',
    kind: 'fixed',
    say: 'Placement crunch time -- where do you stand on offers, or what interview prep do you need most right now?',
    captureAs: 'offer_status',
    next: 'launch_days_left',
  },
  // Y4 sprint intake: timeline, weakest round, offer count, backup plan, mock
  // habit. Option labels are a contract -- the crash-sprint generator in
  // roadmap.ts matches days_left / weakest_round strings verbatim, and
  // launch_mock_status labels feed fsm.ts readinessBand(). Don't rename.
  launch_days_left: {
    id: 'launch_days_left',
    kind: 'fixed',
    say: "First things first -- how close is your next big interview or test?",
    options: [
      { label: '<2wk', next: 'launch_weakest_round' },
      { label: '2–4wk', next: 'launch_weakest_round' },
      { label: '1–3mo', next: 'launch_weakest_round' },
      { label: 'not scheduled', next: 'launch_weakest_round' },
    ],
    captureAs: 'days_left',
  },
  launch_weakest_round: {
    id: 'launch_weakest_round',
    kind: 'fixed',
    say: "Which round worries you the most right now? No judgment -- that's where we aim the prep.",
    options: [
      { label: 'aptitude', next: 'launch_offer_band' },
      { label: 'DSA', next: 'launch_offer_band' },
      { label: 'system design', next: 'launch_offer_band' },
      { label: 'HR-case', next: 'launch_offer_band' },
    ],
    captureAs: 'weakest_round',
  },
  launch_offer_band: {
    id: 'launch_offer_band',
    kind: 'fixed',
    say: 'And the scoreboard -- how many offers are in hand right now?',
    options: [
      { label: '0', next: 'launch_backup_plan' },
      { label: '1', next: 'launch_backup_plan' },
      { label: '2+', next: 'launch_backup_plan' },
    ],
    captureAs: 'offer_count',
  },
  launch_backup_plan: {
    id: 'launch_backup_plan',
    kind: 'fixed',
    say: "Smart players keep a plan B warm. What's yours if placements run long?",
    // Tone branches on the offer count just captured: 0 = sprint mode,
    // 1 = keep momentum, 2+ = negotiation advice. Zero LLM calls.
    sayByAnswer: {
      key: 'offer_count',
      fallback: "Smart players keep a plan B warm. What's yours if placements run long?",
      map: {
        '0': "Okay -- sprint mode. We close the gap fast, but smart sprinters keep a plan B warm. What's yours?",
        '1': "One offer banked -- breathe, you're safe. Now we aim higher; what's your plan B while we do?",
        '2+': "2+ offers? You're negotiating now, not applying -- we'll talk leverage. Still, what's your fallback lane?",
      },
    },
    options: [
      { label: 'higher studies', next: 'launch_mock_status' },
      { label: 'off-campus', next: 'launch_mock_status' },
      { label: 'none yet', next: 'launch_mock_status' },
    ],
    captureAs: 'backup_plan',
  },
  launch_mock_status: {
    id: 'launch_mock_status',
    kind: 'fixed',
    say: 'Last one -- mock interviews. How many have you actually sat through?',
    options: [
      { label: 'none', next: 'launch_higher_studies' },
      { label: '1–2', next: 'launch_higher_studies' },
      { label: 'regular', next: 'launch_higher_studies' },
    ],
    captureAs: 'mock_status',
  },
  launch_higher_studies: {
    id: 'launch_higher_studies',
    kind: 'fixed',
    say: "Quick one, since time's tight -- placements only, or are you weighing higher studies too?",
    captureAs: 'higher_studies_interest',
    next: 'launch_wrapup',
  },
  launch_wrapup: {
    id: 'launch_wrapup',
    kind: 'fixed',
    say: "You've come a long way since {answers.goal}. Here's your final-stretch roadmap -- let's get you across the line.",
    terminal: true,
    gesture: 'thumbsup',
    arm: 'right',
  },
  launch_catchup_intro: {
    id: 'launch_catchup_intro',
    kind: 'fixed',
    say: "First time talking, and it's final year -- let's move fast. What's the target: placement, higher studies, or both?",
    options: [{ label: "Let's go", next: 'launch_catchup_goal' }],
    gesture: 'wave',
    arm: 'right',
  },
  launch_catchup_goal: {
    id: 'launch_catchup_goal',
    kind: 'llm',
    systemPrompt:
      'You are Pathfinder meeting a final-year student for the first time. Ask their goal quickly and warmly, aware they are time-pressured.',
    captureAs: 'goal',
    next: 'launch_offer_check',
  },
};

export function requireNode(id: string): EngineNode {
  const node = NODES[id];
  if (!node) throw new Error(`Unknown node: ${id}`);
  return node;
}
