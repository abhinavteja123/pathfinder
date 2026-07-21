import type { Program, Year } from './types';

/**
 * Scripted, deterministic roadmap generation -- NO LLM calls. The app's free-tier
 * LLM budget is the real capacity ceiling (see PATHFINDER_SYSTEM_DESIGN.md §5),
 * so the roadmap is templated: stage milestones + a per-program catalog of real
 * opportunities (hackathons / internships / OSS). The current stage weaves in the
 * student's captured goal so it doesn't read generic.
 */
export interface RoadmapItemSpec {
  itemId: string;
  category: 'milestone' | 'hackathon' | 'internship' | 'oss';
  title: string;
  description: string;
  link?: string;
  order: number;
}

interface Catalog {
  hackathons: { itemId: string; title: string; description: string; link: string }[];
  internships: { itemId: string; title: string; description: string; link: string }[];
  oss: { itemId: string; title: string; description: string; link: string };
}

const CATALOGS: Record<Program, Catalog> = {
  BTech: {
    hackathons: [
      { itemId: 'hack-mlh', title: 'MLH Hackathons', description: 'Weekend hackathons worldwide — a great first win.', link: 'https://mlh.io/seasons' },
      { itemId: 'hack-devfolio', title: 'Devfolio Hackathons', description: "Browse and apply to India's biggest hackathons.", link: 'https://devfolio.co/hackathons' },
    ],
    internships: [
      { itemId: 'intern-internshala', title: 'Internshala', description: 'Apply to tech internships that match your year.', link: 'https://internshala.com' },
      { itemId: 'intern-linkedin', title: 'LinkedIn Jobs', description: 'Set alerts for early-career and intern roles.', link: 'https://www.linkedin.com/jobs' },
    ],
    oss: { itemId: 'oss-gfi', title: 'Good First Issue', description: 'Make your first open-source contribution today.', link: 'https://goodfirstissue.dev' },
  },
  BBA: {
    hackathons: [
      { itemId: 'hack-unstop', title: 'Unstop Case Comps', description: 'Live case competitions with real prizes.', link: 'https://unstop.com/competitions' },
      { itemId: 'hack-hult', title: 'Hult Prize', description: 'The global social-enterprise challenge.', link: 'https://www.hultprizeat.com' },
    ],
    internships: [
      { itemId: 'intern-internshala', title: 'Internshala', description: 'Apply to business and consulting internships.', link: 'https://internshala.com' },
      { itemId: 'intern-linkedin', title: 'LinkedIn Jobs', description: 'Set alerts for early-career business roles.', link: 'https://www.linkedin.com/jobs' },
    ],
    oss: { itemId: 'oss-project', title: 'Live Client / Portfolio Project', description: 'Ship a real project — consulting, AIESEC, or a startup gig.', link: 'https://unstop.com' },
  },
};

/** Domain-specific opportunity catalog -- keyed by the exact option labels
 * from `discover_domain` in nodes.ts. Scripted, not LLM-picked: the domain
 * choice is a menu answer, so lookup is a direct dictionary hit, no guessing.
 * itemId prefixed `domain-` so the UI can render this as its own "your {domain}
 * roadmap" panel, separate from the universal milestone spine. */
export const DOMAIN_CATALOG: Record<string, { itemId: string; title: string; description: string; link: string }[]> = {
  'AI/ML': [
    { itemId: 'domain-kaggle', title: 'Kaggle', description: 'Real datasets and ML competitions to build a portfolio.', link: 'https://www.kaggle.com' },
    { itemId: 'domain-deeplearningai', title: 'DeepLearning.AI', description: 'Structured courses straight from the field’s best.', link: 'https://www.deeplearning.ai' },
    { itemId: 'domain-paperswithcode', title: 'Papers with Code', description: 'Latest ML research paired with working implementations.', link: 'https://paperswithcode.com' },
  ],
  Cybersecurity: [
    { itemId: 'domain-tryhackme', title: 'TryHackMe', description: 'Guided, hands-on security labs for beginners.', link: 'https://tryhackme.com' },
    { itemId: 'domain-hackthebox', title: 'Hack The Box', description: 'Real-world penetration testing challenges.', link: 'https://www.hackthebox.com' },
    { itemId: 'domain-owasp', title: 'OWASP', description: 'The standard reference for web application security.', link: 'https://owasp.org' },
  ],
  IoT: [
    { itemId: 'domain-hackster', title: 'Hackster.io', description: 'Community IoT projects you can actually build.', link: 'https://www.hackster.io' },
    { itemId: 'domain-arduino', title: 'Arduino Project Hub', description: 'Start here for your first connected-device project.', link: 'https://projecthub.arduino.cc' },
    { itemId: 'domain-raspberrypi', title: 'Raspberry Pi Projects', description: 'Official project guides for Pi-based builds.', link: 'https://projects.raspberrypi.org' },
  ],
  ECE: [
    { itemId: 'domain-ieeexplore', title: 'IEEE Xplore', description: 'Papers and student resources across electronics.', link: 'https://ieeexplore.ieee.org' },
    { itemId: 'domain-hackaday', title: 'Hackaday', description: 'Real hardware builds and circuit-design writeups.', link: 'https://hackaday.com' },
    { itemId: 'domain-allaboutcircuits', title: 'All About Circuits', description: 'Solid reference for circuit design fundamentals.', link: 'https://www.allaboutcircuits.com' },
  ],
  EEE: [
    { itemId: 'domain-nptel', title: 'NPTEL Electrical Engineering', description: 'Free university-grade electrical engineering courses.', link: 'https://nptel.ac.in' },
    { itemId: 'domain-ieeepes', title: 'IEEE Power & Energy Society', description: 'Power systems community, resources, and events.', link: 'https://www.ieee-pes.org' },
    { itemId: 'domain-electrical4u', title: 'Electrical4U', description: 'Clear explainers for core electrical concepts.', link: 'https://www.electrical4u.com' },
  ],
  'Web Dev': [
    { itemId: 'domain-freecodecamp', title: 'freeCodeCamp', description: 'Free, project-based path from basics to full-stack.', link: 'https://www.freecodecamp.org' },
    { itemId: 'domain-theodinproject', title: 'The Odin Project', description: 'A full curriculum, portfolio projects included.', link: 'https://www.theodinproject.com' },
    { itemId: 'domain-mdn', title: 'MDN Web Docs', description: 'The reference every web dev keeps open.', link: 'https://developer.mozilla.org' },
  ],
  'Cloud/DevOps': [
    { itemId: 'domain-awsskillbuilder', title: 'AWS Skill Builder', description: 'Free, official AWS training and certification prep.', link: 'https://skillbuilder.aws' },
    { itemId: 'domain-docker', title: 'Docker 101 Tutorial', description: 'Hands-on intro to containers, no local setup needed.', link: 'https://www.docker.com/101-tutorial' },
    { itemId: 'domain-kubernetes', title: 'Kubernetes Tutorials', description: 'Official, guided intro to container orchestration.', link: 'https://kubernetes.io/docs/tutorials' },
  ],
  'Mobile Dev': [
    { itemId: 'domain-flutter', title: 'Flutter Codelabs', description: 'Guided, hands-on Flutter app-building tutorials.', link: 'https://docs.flutter.dev/codelabs' },
    { itemId: 'domain-android', title: 'Android Developers', description: "Google's official Android development courses.", link: 'https://developer.android.com/courses' },
    { itemId: 'domain-reactnative', title: 'React Native Docs', description: 'Build cross-platform apps if you already know React.', link: 'https://reactnative.dev' },
  ],
  Blockchain: [
    { itemId: 'domain-cryptozombies', title: 'CryptoZombies', description: 'Learn Solidity by building a zombie game, step by step.', link: 'https://cryptozombies.io' },
    { itemId: 'domain-ethereumdevs', title: 'Ethereum.org for Developers', description: 'Official docs and tutorials for building on Ethereum.', link: 'https://ethereum.org/en/developers' },
    { itemId: 'domain-alchemyuniversity', title: 'Alchemy University', description: 'Free, structured Web3 developer bootcamp.', link: 'https://university.alchemy.com' },
  ],
  'Data Science': [
    { itemId: 'domain-datacamp', title: 'DataCamp', description: 'Interactive courses across the whole data science stack.', link: 'https://www.datacamp.com' },
    { itemId: 'domain-uciml', title: 'UCI ML Repository', description: 'Classic real datasets to practice analysis on.', link: 'https://archive.ics.uci.edu' },
    { itemId: 'domain-kaggle-ds', title: 'Kaggle Datasets', description: 'Real-world datasets and notebooks to learn from.', link: 'https://www.kaggle.com/datasets' },
  ],
  // Branch-specific domains -- keyed by discover_domain's optionsByBranch
  // labels (ECE/EEE/Civil/Mechanical menus). Labels must match verbatim.
  'VLSI Design': [
    { itemId: 'domain-nptelvlsi', title: 'NPTEL VLSI Design', description: 'Free university-grade VLSI courses -- the certification ECE recruiters recognize.', link: 'https://nptel.ac.in' },
    { itemId: 'domain-vsd', title: 'VLSI System Design (VSD)', description: 'Hands-on open-source chip design workshops and tapeout programs.', link: 'https://www.vlsisystemdesign.com' },
    { itemId: 'domain-chipverify', title: 'ChipVerify', description: 'Verilog and SystemVerilog tutorials for design and verification.', link: 'https://www.chipverify.com' },
  ],
  'Embedded Systems': [
    { itemId: 'domain-embarduino', title: 'Arduino Project Hub', description: 'Start building real embedded projects this weekend.', link: 'https://projecthub.arduino.cc' },
    { itemId: 'domain-freertos', title: 'FreeRTOS', description: 'The real-time OS running inside millions of devices -- official docs and demos.', link: 'https://www.freertos.org' },
    { itemId: 'domain-nptelembedded', title: 'NPTEL Embedded Systems', description: 'Certification-backed embedded systems fundamentals.', link: 'https://nptel.ac.in' },
  ],
  'Signal Processing': [
    { itemId: 'domain-dspcoursera', title: 'DSP Specialization (Coursera)', description: 'University-grade digital signal processing, from basics up.', link: 'https://www.coursera.org/specializations/digital-signal-processing' },
    { itemId: 'domain-matlabonramp', title: 'MATLAB Onramp', description: 'Free official MATLAB training -- the tool of the trade.', link: 'https://matlabacademy.mathworks.com' },
    { itemId: 'domain-thinkdsp', title: 'Think DSP', description: 'Free book: learn signal processing in Python by doing.', link: 'https://greenteapress.com/wp/think-dsp/' },
  ],
  'Power Systems': [
    { itemId: 'domain-nptelpower', title: 'NPTEL Power Systems', description: 'Core power engineering courses with certification.', link: 'https://nptel.ac.in' },
    { itemId: 'domain-simulink', title: 'Simulink Onramp', description: 'Free official training for modeling power and control systems.', link: 'https://matlabacademy.mathworks.com' },
    { itemId: 'domain-pes', title: 'IEEE Power & Energy Society', description: 'Student membership, scholarships, and the power community.', link: 'https://www.ieee-pes.org' },
  ],
  'Control Systems': [
    { itemId: 'domain-briandouglas', title: 'Brian Douglas (YouTube)', description: 'The clearest control theory explanations on the internet.', link: 'https://www.youtube.com/user/ControlLectures' },
    { itemId: 'domain-ctrlonramp', title: 'Control Design Onramp', description: 'Free official MATLAB/Simulink control design training.', link: 'https://matlabacademy.mathworks.com' },
    { itemId: 'domain-nptelcontrol', title: 'NPTEL Control Engineering', description: 'Certification-backed control systems fundamentals.', link: 'https://nptel.ac.in' },
  ],
  'Structural Design': [
    { itemId: 'domain-staadpro', title: 'STAAD Pro (Bentley)', description: 'The structural analysis tool on Civil job descriptions -- student access available.', link: 'https://www.bentley.com/software/staad/' },
    { itemId: 'domain-autocad', title: 'Autodesk AutoCAD Certification', description: 'The baseline drafting certification every Civil student should hold.', link: 'https://www.autodesk.com/certification' },
    { itemId: 'domain-nptelstruct', title: 'NPTEL Structural Analysis', description: 'Free IIT structural engineering courses with certification.', link: 'https://nptel.ac.in' },
  ],
  'Construction Management': [
    { itemId: 'domain-cmcoursera', title: 'Construction Management (Coursera)', description: 'Columbia University specialization -- scheduling, cost, delivery.', link: 'https://www.coursera.org/specializations/construction-management' },
    { itemId: 'domain-primavera', title: 'Oracle Primavera P6', description: 'The project-scheduling tool used on real sites -- learn it early.', link: 'https://www.oracle.com/construction-engineering/primavera-p6/' },
    { itemId: 'domain-nptelcm', title: 'NPTEL Construction Management', description: 'Certification-backed project planning fundamentals.', link: 'https://nptel.ac.in' },
  ],
  'GIS & Surveying': [
    { itemId: 'domain-qgis', title: 'QGIS Training', description: 'Free, open-source GIS -- the official training manual.', link: 'https://docs.qgis.org/latest/en/docs/training_manual/' },
    { itemId: 'domain-earthengine', title: 'Google Earth Engine', description: 'Planet-scale satellite data analysis, free for students.', link: 'https://earthengine.google.com' },
    { itemId: 'domain-esrimooc', title: 'Esri MOOCs', description: 'Free courses from the makers of ArcGIS.', link: 'https://www.esri.com/training/mooc/' },
  ],
  'CAD & Design': [
    { itemId: 'domain-cswa', title: 'SolidWorks CSWA', description: 'The entry CAD certification Mechanical recruiters actually list.', link: 'https://www.solidworks.com/solidworks-certification-program' },
    { itemId: 'domain-fusion360', title: 'Fusion 360 for Students', description: 'Free professional CAD/CAM -- learn modeling and simulation.', link: 'https://www.autodesk.com/products/fusion-360/education' },
    { itemId: 'domain-grabcad', title: 'GrabCAD', description: 'Millions of real CAD models -- your design portfolio lives here.', link: 'https://grabcad.com' },
  ],
  Robotics: [
    { itemId: 'domain-ros', title: 'ROS Tutorials', description: 'The Robot Operating System -- the industry-standard robotics stack.', link: 'https://docs.ros.org' },
    { itemId: 'domain-roboarduino', title: 'Arduino Robotics Projects', description: 'Build your first real robot with parts you can afford.', link: 'https://projecthub.arduino.cc' },
    { itemId: 'domain-nptelrobotics', title: 'NPTEL Robotics', description: 'Certification-backed robotics and mechatronics courses.', link: 'https://nptel.ac.in' },
  ],
  'Thermal & Energy': [
    { itemId: 'domain-nptelthermo', title: 'NPTEL Thermal Engineering', description: 'IIT thermodynamics and heat transfer, with certification.', link: 'https://nptel.ac.in' },
    { itemId: 'domain-ansysstudent', title: 'Ansys Student', description: 'Free simulation software -- model real thermal and fluid systems.', link: 'https://www.ansys.com/academic/students' },
    { itemId: 'domain-simscale', title: 'SimScale', description: 'Cloud-based CFD/FEA simulation with a free community plan.', link: 'https://www.simscale.com' },
  ],
  'Manufacturing & 3D Printing': [
    { itemId: 'domain-nptelmfg', title: 'NPTEL Manufacturing Processes', description: 'Core manufacturing fundamentals with certification.', link: 'https://nptel.ac.in' },
    { itemId: 'domain-fusioncam', title: 'Fusion 360 CAM', description: 'Learn CNC programming free with the student license.', link: 'https://www.autodesk.com/products/fusion-360/education' },
    { itemId: 'domain-printables', title: 'Printables Academy', description: 'Practical 3D printing lessons from design to finished part.', link: 'https://www.printables.com/education' },
  ],
  // BBA domains -- keyed by discover_domain's optionsByProgram.BBA labels.
  Marketing: [
    { itemId: 'domain-hubspot', title: 'HubSpot Academy', description: 'Free, certificate-backed courses in digital marketing.', link: 'https://academy.hubspot.com' },
    { itemId: 'domain-skillshop', title: 'Google Skillshop', description: 'Official Google Ads and Analytics certifications.', link: 'https://skillshop.withgoogle.com' },
    { itemId: 'domain-mozseo', title: 'Moz SEO Guide', description: 'The classic beginner-to-solid guide for search marketing.', link: 'https://moz.com/beginners-guide-to-seo' },
  ],
  Finance: [
    { itemId: 'domain-varsity', title: 'Zerodha Varsity', description: 'Free, deep modules on markets, trading, and personal finance.', link: 'https://zerodha.com/varsity/' },
    { itemId: 'domain-cfi', title: 'Corporate Finance Institute', description: 'Free courses on valuation, modeling, and accounting basics.', link: 'https://corporatefinanceinstitute.com' },
    { itemId: 'domain-investopedia', title: 'Investopedia', description: 'The reference for every finance term you will ever meet.', link: 'https://www.investopedia.com' },
  ],
  HR: [
    { itemId: 'domain-aihr', title: 'AIHR', description: 'Modern HR skills -- people analytics, digital HR, org design.', link: 'https://www.aihr.com' },
    { itemId: 'domain-hrmcoursera', title: 'HRM Specialization (Coursera)', description: 'University-grade grounding in hiring, rewards, and management.', link: 'https://www.coursera.org/specializations/human-resource-management' },
    { itemId: 'domain-shrm', title: 'SHRM', description: 'The global HR professional body -- standards and student resources.', link: 'https://www.shrm.org' },
  ],
  Operations: [
    { itemId: 'domain-mitscm', title: 'MITx Supply Chain (edX)', description: 'The gold-standard free supply chain management courses.', link: 'https://www.edx.org/masters/micromasters/mitx-supply-chain-management' },
    { itemId: 'domain-scmcoursera', title: 'Supply Chain Specialization (Coursera)', description: 'End-to-end operations: logistics, planning, sourcing.', link: 'https://www.coursera.org/specializations/supply-chain-management' },
    { itemId: 'domain-ascm', title: 'ASCM', description: 'The operations/supply-chain professional body and certifications.', link: 'https://www.ascm.org' },
  ],
  'Business Analytics': [
    { itemId: 'domain-gda', title: 'Google Data Analytics Certificate', description: 'The most-recommended entry path into analytics roles.', link: 'https://www.coursera.org/professional-certificates/google-data-analytics' },
    { itemId: 'domain-kagglelearn', title: 'Kaggle Learn', description: 'Short, hands-on micro-courses -- SQL, Python, visualization.', link: 'https://www.kaggle.com/learn' },
    { itemId: 'domain-powerbi', title: 'Microsoft Learn: Power BI', description: 'Free official path for the dashboard tool recruiters ask for.', link: 'https://learn.microsoft.com/power-bi' },
  ],
};

// Each year is a themed "mission" with concrete, do-this-now guidance instead of
// a flat one-liner -- this is the per-year roadmap guiding the student asked for.
// Deterministic/scripted (no LLM cost); the current-year card also weaves in the
// captured goal below.
const STAGES: { year: Year; itemId: string; name: string; base: string }[] = [
  // Year cards stay SHORT -- just the themed tagline. The concrete actions live
  // in the per-year steps below (STEP_GUIDE), so a long description here would
  // both duplicate them and make the spine card tall enough to overlap its first
  // step in the flow (caught from a screenshot).
  // Emoji lives in RoadmapFlow's YEAR_THEME badge now, not in the copy --
  // having it in both places doubled it up on the card.
  { year: 1, itemId: 'milestone-discover', name: 'Discover', base: 'Explorer year — sample widely, then pick your lane.' },
  { year: 2, itemId: 'milestone-build', name: 'Build', base: 'Builder year — go deep and ship real projects.' },
  { year: 3, itemId: 'milestone-convert', name: 'Convert', base: 'Closer year — turn skills into offers.' },
  { year: 4, itemId: 'milestone-launch', name: 'Launch', base: 'Launch year — convert and cross the line.' },
];

// Per-year sub-steps -- the "deeper guidance" the student asked for: each year's
// mission broken into 3-4 concrete, do-this-now checklist nodes instead of one
// card. Rendered as a vertical checklist under their year on the journey spine
// (see RoadmapFlow). Category stays 'milestone' so the existing journey-panel
// filters pick them up; the `step-{year}-{k}` itemId is what tells the flow to
// stack them under the year rather than lay them out as another spine column.
const STEP_GUIDE: Record<Year, { title: string; description: string }[]> = {
  1: [
    { title: 'Set up your presence', description: 'Create GitHub + LinkedIn, add a photo and one line about you.' },
    { title: 'Ship something tiny', description: 'Build one small project (a to-do app, a Discord bot) and push it public.' },
    { title: 'Taste a hackathon', description: 'Join one beginner-friendly hackathon (MLH / Devfolio) just to feel it.' },
    { title: 'Pick a lane', description: 'Try 2–3 domains; notice what makes you lose track of time.' },
  ],
  2: [
    { title: 'Go deep', description: 'Pick your domain and finish one structured course end-to-end.' },
    { title: 'Build in public', description: 'Ship 2–3 real portfolio projects, each with a proper README.' },
    { title: 'Start DSA', description: 'Solve LeetCode daily — aim for consistency, not speed.' },
    { title: 'First internship', description: 'Apply on Internshala / LinkedIn; even a small one counts.' },
  ],
  3: [
    { title: 'PPO-track internships', description: 'Target internships that convert to full-time offers.' },
    { title: 'DSA + system design', description: 'Level up to interview-grade problem solving.' },
    { title: 'Mock interviews', description: 'Do regular mocks; get comfortable thinking out loud.' },
    { title: 'Recruiter-ready portfolio', description: 'Pin your best repos, polish LinkedIn, ask for referrals.' },
  ],
  4: [
    { title: 'Convert your internship', description: 'Turn your PPO into a signed full-time offer.' },
    { title: 'Ace the final rounds', description: 'Prep company-specific interviews and system design.' },
    { title: 'Backups + negotiation', description: 'Keep 2–3 offers live; negotiate before you sign.' },
  ],
};

// Branch-specific per-year steps -- same shape as STEP_GUIDE, keyed by
// `answers.branch` (menu answer, direct dictionary hit). CSE is deliberately
// absent: the existing STEP_GUIDE above IS the CSE/coding guide and stays the
// fallback. Core branches get degree-life guidance instead -- courses/GPA,
// certifications, core-vs-IT and GATE decisions -- because for ECE/EEE/Civil/
// Mechanical the college curriculum genuinely is the career track.
const BRANCH_STEP_GUIDE: Record<string, Record<Year, { title: string; description: string }[]>> = {
  ECE: {
    1: [
      { title: 'Take core courses seriously', description: 'Digital design and signals are your foundation — GPA genuinely matters for core branches.' },
      { title: 'Learn C properly', description: 'Work through C basics until pointers feel normal — it powers every embedded role.' },
      { title: 'Build your first Arduino project', description: 'Wire up one tiny build (LED blinker, sensor logger) and share it.' },
    ],
    2: [
      { title: 'Go deep on digital + signals', description: 'Master digital electronics and signals coursework — core interviews test exactly this.' },
      { title: 'Ship embedded mini-projects', description: 'Build 2–3 Arduino/microcontroller projects, each with a proper writeup.' },
      { title: 'Start an NPTEL certification', description: 'Finish one NPTEL VLSI or embedded systems course end-to-end.' },
      { title: 'Keep coding on the side', description: 'Practice C/C++ and basic DSA weekly — the IT door stays open.' },
    ],
    3: [
      { title: 'Pick core vs IT', description: 'Decide your lane — core electronics or software — and commit your prep time to it.' },
      { title: 'Land a core internship', description: 'Apply to VLSI/embedded internships; even a small hardware stint counts.' },
      { title: 'Make the GATE call', description: 'Decide on GATE for M.Tech/PSU now — it needs a full year of prep.' },
      { title: 'Polish your project trail', description: 'Clean up writeups and revise core subjects for interviews.' },
    ],
    4: [
      { title: 'Double-track placement prep', description: 'Revise core fundamentals and aptitude/coding in parallel — sit for both core and software drives.' },
      { title: 'Convert your internship', description: 'Push your internship toward a full-time or PPO conversion.' },
      { title: 'Backups + final rounds', description: 'Keep 2–3 processes live; drill company-specific rounds.' },
    ],
  },
  EEE: {
    1: [
      { title: 'Nail circuits fundamentals', description: 'Circuit theory and machines are your foundation — GPA genuinely matters for core branches.' },
      { title: 'Start MATLAB early', description: 'Finish the free MATLAB Onramp — it is on every EEE job description.' },
      { title: 'Get hands-on in the lab', description: 'Treat wiring, motors, and lab kits as training, not attendance.' },
    ],
    2: [
      { title: 'Master machines + power basics', description: 'Go deep on electrical machines and power systems coursework.' },
      { title: 'Get Simulink-certified', description: 'Finish the MATLAB/Simulink Onramps — the modeling tools of the trade.' },
      { title: 'Build an embedded/IoT project', description: 'Ship one microcontroller build (energy meter, home automation) with a writeup.' },
      { title: 'Scout the PSU lane', description: 'Read up on GATE-based PSU recruitment — it rewards strong Y2 fundamentals.' },
    ],
    3: [
      { title: 'Commit to your lane', description: 'Choose power/PSU, core industry, or software — each needs different prep.' },
      { title: 'Start GATE prep if PSU-bound', description: 'PSUs hire through GATE — begin timed previous-year papers now.' },
      { title: 'Land a core internship', description: 'Apply to power, automation, and electronics internships early.' },
      { title: 'Document your projects', description: 'Publish your Simulink and IoT work with clean writeups.' },
    ],
    4: [
      { title: 'Double-track placement prep', description: 'Revise core subjects and aptitude in parallel — sit for both core and IT drives.' },
      { title: 'GATE/PSU final push', description: 'If PSU-bound, one timed paper a day; review every miss the same evening.' },
      { title: 'Backups + negotiation', description: 'Keep 2–3 offers live; negotiate before you sign.' },
    ],
  },
  Civil: {
    1: [
      { title: 'Take core courses seriously', description: 'Mechanics and surveying are your foundation — GPA genuinely matters for core branches.' },
      { title: 'Get AutoCAD-certified early', description: 'Finish an AutoCAD certification — the baseline every Civil recruiter expects.' },
      { title: 'Max out surveying camp', description: 'Treat survey camp and site visits as real field training, not attendance.' },
    ],
    2: [
      { title: 'Learn STAAD Pro', description: 'Start STAAD Pro — the structural analysis tool on real job descriptions.' },
      { title: 'Take an NPTEL structural course', description: 'Finish one NPTEL structural analysis course with certification.' },
      { title: 'Get on a real site', description: 'Visit construction sites in breaks; shadow a working engineer.' },
      { title: 'Scout the GATE/PSU lane', description: 'Understand GATE-based PSU and govt recruitment — the biggest Civil employers.' },
    ],
    3: [
      { title: 'Do a site internship', description: 'Spend a summer on an actual site — recruiters always ask about it.' },
      { title: 'Make the GATE call', description: 'Decide on GATE for M.Tech/PSU now — it needs a full year of prep.' },
      { title: 'Weigh the IES option', description: 'If govt engineering services appeal, IES prep runs alongside GATE.' },
      { title: 'Build a drawings portfolio', description: 'Collect your AutoCAD/STAAD work into one shareable portfolio.' },
    ],
    4: [
      { title: 'Placement prep, core-first', description: 'Revise structures, geotech, and estimation — core rounds test the syllabus.' },
      { title: 'GATE/IES final push', description: 'If exam-bound, one timed previous-year paper a day.' },
      { title: 'Backups + negotiation', description: 'Keep 2–3 offers live; negotiate before you sign.' },
    ],
  },
  Mechanical: {
    1: [
      { title: 'Take core courses seriously', description: 'Thermo and mechanics are your foundation — GPA genuinely matters for core branches.' },
      { title: 'Get CAD-certified early', description: 'Finish SolidWorks CSWA or Fusion 360 basics — the entry ticket to design roles.' },
      { title: 'Live in the workshop', description: 'Learn machining, welding, and 3D printing hands-on — fab skills compound.' },
    ],
    2: [
      { title: 'Join an SAE/robotics team', description: 'Build a real vehicle or robot with a club team — recruiters love it.' },
      { title: 'Add simulation to your CAD', description: 'Learn Ansys or Fusion 360 simulation on top of your modeling base.' },
      { title: 'Ship a fab project', description: 'Design, machine or print, and assemble one complete build with a writeup.' },
      { title: 'Keep fundamentals sharp', description: 'Thermo, fluids, and materials coursework feed every core interview.' },
    ],
    3: [
      { title: 'Land a core internship', description: 'Apply to manufacturing, automotive, and design internships early.' },
      { title: 'Make the GATE call', description: 'Decide on GATE for M.Tech/PSU now — it needs a full year of prep.' },
      { title: 'Own a subsystem', description: 'Lead one subsystem on your SAE/robotics team — leadership stories sell.' },
      { title: 'Publish your models', description: 'Put your best CAD models and simulations on GrabCAD.' },
    ],
    4: [
      { title: 'Double-track placement prep', description: 'Revise core subjects and aptitude in parallel — sit for both core and IT drives.' },
      { title: 'Turn projects into stories', description: 'Shape your internship and team builds into interview-winning answers.' },
      { title: 'Backups + negotiation', description: 'Keep 2–3 offers live; negotiate before you sign.' },
    ],
  },
};

// BBA business step guide -- BBA is a program (no engineering `branch`), so
// without this it would fall back to the coding STEP_GUIDE and show a business
// student GitHub/LeetCode/DSA steps. Business-flavored instead: LinkedIn/case
// comps/certifications/internships, zero coding.
const BBA_STEP_GUIDE: Record<Year, { title: string; description: string }[]> = {
  1: [
    { title: 'Set up a professional LinkedIn', description: 'Build a real LinkedIn profile — photo, headline, your interests. It is your business-world resume.' },
    { title: 'Enter a case competition', description: 'Join one Unstop case comp just to feel it — structured problem-solving under time.' },
    { title: 'Sharpen Excel + communication', description: 'Get fluent in Excel and public speaking — the two skills every business role uses daily.' },
  ],
  2: [
    { title: 'Pick your specialization', description: 'Go deep on Marketing / Finance / HR / Ops / Analytics and finish one structured course in it.' },
    { title: 'Get a recognized certification', description: 'A Google/HubSpot/analytics or finance certificate recruiters actually list.' },
    { title: 'Do a live project or gig', description: 'A real client, AIESEC, or a startup gig — proof you can apply the theory.' },
    { title: 'First internship', description: 'Apply on Internshala/LinkedIn — even a small business internship counts.' },
  ],
  3: [
    { title: 'Target-firm summer internship', description: 'Chase internships that can convert — consulting, marketing, finance, analytics.' },
    { title: 'Master case + GD/PI', description: 'Guesstimates, cases, and group discussions — the core of B-school placements.' },
    { title: 'Build analytics skills', description: 'Excel, SQL, and Power BI/Tableau — the data literacy every modern business role wants.' },
    { title: 'Recruiter-ready profile', description: 'Polish resume + LinkedIn, and line up referrals through alumni.' },
  ],
  4: [
    { title: 'Convert / final placements', description: 'Push your internship toward a full-time offer and sit for final placements.' },
    { title: 'Ace GD-PI + case rounds', description: 'Company-specific case prep and mock interviews until it feels routine.' },
    { title: 'Backups + negotiation', description: 'Keep 2–3 offers live; negotiate before you sign.' },
  ],
};

// --- Y4 crash-sprint track -------------------------------------------------
// Keyed by the EXACT option labels captured in nodes.ts (launch_days_left /
// launch_weakest_round / convert_target_type) -- menu answers, so lookups are
// direct dictionary hits, no guessing. Scripted like everything else here.
type SprintBody = { title: string; description: string; link?: string };

// Two dedicated drill items per weakest round, each carrying one real free resource.
const SPRINT_DRILLS: Record<string, { link: string; drills: [SprintBody, SprintBody] }> = {
  DSA: {
    link: 'https://neetcode.io/practice',
    drills: [
      { title: 'Grind NeetCode 150', description: 'Arrays, strings, hashmaps first — 4–5 timed problems a day.' },
      { title: 'NeetCode 150, hard half', description: 'Trees, graphs, DP — and redo every problem you missed the first time.' },
    ],
  },
  'system design': {
    link: 'https://github.com/donnemartin/system-design-primer',
    drills: [
      { title: 'Work the system-design-primer', description: 'Scalability basics end-to-end; sketch one architecture on paper daily.' },
      { title: 'Drill the classic designs', description: 'URL shortener, chat, news feed — talk each one out loud for 30 minutes.' },
    ],
  },
  aptitude: {
    link: 'https://www.indiabix.com',
    drills: [
      { title: 'Timed IndiaBix sets', description: 'One full quant + logical section daily; log your accuracy per topic.' },
      { title: 'Close your worst topics', description: 'Redo your lowest-scoring IndiaBix topics until you clear 80% under time.' },
    ],
  },
  'HR-case': {
    link: 'https://www.themuse.com/advice/star-interview-method',
    drills: [
      { title: 'Write six STAR stories', description: 'Conflict, failure, leadership, ambiguity — one page each, real details.' },
      { title: 'Rehearse STAR out loud', description: 'Record yourself answering with the STAR method until it sounds natural.' },
    ],
  },
};

// One sprint item flavored by where the student is aiming.
const TARGET_PREP: Record<string, SprintBody> = {
  'product cos': { title: 'Company-tagged grind', description: 'Grind company-tagged questions for your target list; read recent interview experiences.' },
  startups: { title: 'Ship a live demo', description: 'Polish your best repo into a working demo with a crisp 2-minute walkthrough — startups hire on proof.' },
  core: { title: 'Core-subject revision', description: 'One branch fundamental a day plus past company papers — core rounds test the syllabus.' },
  consulting: { title: 'Daily case drills', description: 'One guesstimate + one full case a day with a partner, frameworks spoken out loud.' },
  'govt-PSU': { title: 'GATE/PSU pattern papers', description: 'One timed previous-year paper a day; review every wrong answer the same evening.' },
};

/** Day-keyed crash-sprint plan for Y4 -- only built when launch_days_left was
 * answered. '<2wk' compresses to a 14-day / 4-item plan; everything else
 * (incl. 'not scheduled') gets the 30-day / 6-item plan. itemId `sprint-{k}`
 * and order 900+k park these after the whole roadmap so the UI can render
 * them as their own countdown panel. */
function buildSprintItems(answers: Record<string, string>): RoadmapItemSpec[] {
  const round = SPRINT_DRILLS[answers.weakest_round ?? ''] ?? {
    // ponytail: weakest_round is asked right after days_left, so this only
    // covers a roadmap requested in that one-turn window -- generic drills.
    link: undefined,
    drills: [
      { title: 'Timed practice blocks', description: 'Split daily timed sets across your shakiest rounds; log every miss.' },
      { title: 'Redo your misses', description: 'Re-solve everything you missed this week until it is automatic.' },
    ],
  };
  const [drillA, drillB] = round.drills.map((d) => ({ ...d, link: round.link }));
  const target =
    TARGET_PREP[answers.target_type ?? ''] ??
    { title: 'Final-prep circuit', description: 'Alternate timed practice and mock rounds daily; review every miss the same day.' };
  const finale: SprintBody = { title: 'Full mock loop', description: 'Simulate the real thing end-to-end — aptitude to HR — and rest the day before.' };

  const plan: { day: string; body: SprintBody }[] =
    answers.days_left === '<2wk'
      ? [
          { day: 'Day 1–3', body: drillA },
          { day: 'Day 4–7', body: drillB },
          { day: 'Day 8–11', body: target },
          { day: 'Day 12–14', body: finale },
        ]
      : [
          answers.days_left === 'not scheduled'
            ? { day: 'Day 0', body: { title: 'Lock a target date', description: 'Pick one drive/company and put it on the calendar.' } }
            : { day: 'Day 1–5', body: { title: 'Rebuild your baseline', description: 'Take one timed mock of each round; list your three weakest topics.' } },
          { day: 'Day 6–12', body: drillA },
          { day: 'Day 13–19', body: drillB },
          { day: 'Day 20–24', body: target },
          { day: 'Day 25–27', body: { title: 'Keep backups live', description: 'Apply to 2–3 parallel processes and ping referrals — never walk in with one option.' } },
          { day: 'Day 28–30', body: finale },
        ];

  return plan.map((p, k) => ({
    itemId: `sprint-${k}`,
    category: 'milestone' as const,
    title: `${p.day}: ${p.body.title}`,
    description: p.body.description,
    ...(p.body.link ? { link: p.body.link } : {}),
    order: 900 + k,
  }));
}

// Pacing suffix appended to every step description -- keyed by the EXACT
// time_budget menu labels from nodes.ts, direct dictionary hit like the rest.
const PACING: Record<string, string> = {
  '<3 hrs/week': ' (pace: one small win per week.)',
  '3–7 hrs/week': ' (pace: 2–3 focused sessions weekly.)',
  '8+ hrs/week': ' (pace: go hard — weekly milestones.)',
};

// R1 'Above 50 LPA' stretch lane -- exactly two extra milestone items, flavored
// by branch. Core branches (ECE/EEE/Civil/Mechanical) get the GATE + top-core
// pair; CSE or no/unknown branch gets the open-source + interview-grind pair.
// itemId `stretch-{k}`, order 800+k parks them after the domain items and
// before the 900+ sprint block.
const CORE_BRANCHES = new Set(['ECE', 'EEE', 'Civil', 'Mechanical']);
const STRETCH_CORE: SprintBody[] = [
  { title: 'GATE top-rank lane', description: 'A top GATE rank is the surest route to 50-LPA-class core offers — elite M.Tech, PSUs, and research labs all key off it.', link: 'https://gate2026.iitg.ac.in' },
  { title: 'Target the top core companies', description: 'Top core recruiters weight certifications and GPA heavily — stack NPTEL/tool certs on a strong CGPA from day one.' },
];
const STRETCH_CSE: SprintBody[] = [
  { title: 'Ship a merged open-source PR', description: 'A merged PR in a real project (GSoC orgs, Good First Issues) is the strongest top-company signal.', link: 'https://goodfirstissue.dev' },
  { title: 'Company-tagged interview grind', description: 'Drill company-tagged problem sets for the top-paying companies until timed sets feel routine.', link: 'https://neetcode.io/practice' },
];
// BBA 50-LPA stretch -- business, zero coding (BBA has no engineering branch, so
// without this it fell through to STRETCH_CSE and got a GitHub PR + NeetCode grind).
const STRETCH_BBA: SprintBody[] = [
  { title: 'Crack the premium recruiters', description: 'Top consulting / IB / product roles pay in that band and hire on case-cracking — drill cases daily and network into referrals.', link: 'https://unstop.com/competitions' },
  { title: 'Ship a standout analytics project', description: 'A live market/finance/analytics project with real numbers is your 50-LPA differentiator — build one and put it on LinkedIn.' },
];

export function generateRoadmap(input: {
  year: Year;
  program: Program;
  answers: Record<string, string>;
}): RoadmapItemSpec[] {
  const { year, program, answers } = input;
  const goal = answers.goal?.trim();

  const milestones: RoadmapItemSpec[] = STAGES.map((s) => ({
    itemId: s.itemId,
    category: 'milestone' as const,
    title: s.name,
    description:
      s.year === year && goal
        // Base sentence always stays grammatically whole -- goal is raw
        // free-text from an LLM node ("what game's got you hooked?" etc, not
        // a real goal statement), so it can't be trusted as a sentence's
        // object. Quoting it as an aside reads fine no matter how short or
        // fragment-like the captured answer is.
        ? `You're here now. ${s.base} (You said: "${goal}")`
        : s.year === year
          ? `You're here now. ${s.base}`
          : s.base,
    order: s.year - 1,
  }));

  // Y3/Y4 are conversion/placement-focused; nudge the internship copy accordingly.
  const senior = year >= 3;
  const cat = CATALOGS[program];
  // Core branches (ECE/EEE/Civil/Mechanical) get their real specialization
  // resources via DOMAIN_CATALOG below; the generic "Good First Issue" open-
  // source card is CSE/coding-specific, so drop it for them -- a Civil student
  // has no use for a GitHub open-source contribution card.
  const baseOpportunities: RoadmapItemSpec[] = [
    ...cat.hackathons,
    ...cat.internships.map((i) =>
      i.itemId === 'intern-internshala' && senior
        ? { ...i, description: 'Target PPO-track internships — conversion matters now.' }
        : i
    ),
    ...(CORE_BRANCHES.has(answers.branch) ? [] : [cat.oss]),
  ].map((o, i) => ({
    itemId: o.itemId,
    category: (o.itemId.startsWith('hack')
      ? 'hackathon'
      : o.itemId.startsWith('intern')
        ? 'internship'
        : 'oss') as RoadmapItemSpec['category'],
    title: o.title,
    description: o.description,
    link: o.link,
    order: STAGES.length + i,
  }));

  // Domain answer (from discover_domain's menu) gets its own curated catalog,
  // ADDED alongside the base hackathon/internship items above (not replacing
  // them -- a domain-track student still needs real hackathons/internships,
  // this just adds a specialization track on top). itemId prefixed `domain-`
  // so the UI can render it as its own "your {domain} roadmap" panel, separate
  // from both the universal milestone spine and the base opportunities.
  const domainCatalog = answers.domain ? DOMAIN_CATALOG[answers.domain] : undefined;
  const domainItems: RoadmapItemSpec[] = domainCatalog
    ? domainCatalog.map((o, i) => ({
        itemId: o.itemId,
        category: 'oss' as const,
        title: o.title,
        description: o.description,
        link: o.link,
        order: STAGES.length + baseOpportunities.length + i,
      }))
    : [];

  // Per-year checklist sub-steps. Category 'milestone' (so they ride the journey
  // panel's existing filter), itemId `step-{year}-{k}` so RoadmapFlow stacks them
  // vertically under their year instead of adding spine columns. order encodes
  // year*10+k purely for stable within-year sorting. Core branches get their
  // BRANCH_STEP_GUIDE; CSE (or no branch answer) falls back to STEP_GUIDE.
  const stepGuide =
    program === 'BBA'
      ? BBA_STEP_GUIDE
      : (answers.branch && BRANCH_STEP_GUIDE[answers.branch]) || STEP_GUIDE;
  // Semester tag (R2): first half of a year's steps = S1, rest = S2. Pacing
  // suffix (P3): only when time_budget was answered -- keyed by exact label.
  const pacing = answers.time_budget ? (PACING[answers.time_budget] ?? '') : '';
  const stepItems: RoadmapItemSpec[] = STAGES.flatMap((s) => {
    const steps = stepGuide[s.year] ?? [];
    const half = Math.ceil(steps.length / 2);
    return steps.map((step, k) => ({
      itemId: `step-${s.year}-${k}`,
      category: 'milestone' as const,
      title: `Y${s.year}·S${k < half ? 1 : 2} — ${step.title}`,
      description: step.description + pacing,
      order: s.year * 10 + k,
    }));
  });

  // R1: Above-50 package goal earns the two-stretch lane, branch-flavored.
  const stretchItems: RoadmapItemSpec[] =
    answers.package_goal === 'Above 50 LPA'
      ? (program === 'BBA' ? STRETCH_BBA : CORE_BRANCHES.has(answers.branch) ? STRETCH_CORE : STRETCH_CSE).map((s, k) => ({
          // `stretch-4-{k}`: the year segment makes RoadmapFlow stack these
          // under Y4 (Launch) -- the 50-LPA end-goal lane -- via yearOf().
          itemId: `stretch-4-${k}`,
          category: 'milestone' as const,
          title: s.title,
          description: s.description,
          ...(s.link ? { link: s.link } : {}),
          order: 800 + k,
        }))
      : [];

  // Y4 crash-sprint track: only once the student has answered launch_days_left.
  const sprintItems: RoadmapItemSpec[] =
    year === 4 && answers.days_left ? buildSprintItems(answers) : [];

  return [...milestones, ...stepItems, ...baseOpportunities, ...domainItems, ...stretchItems, ...sprintItems];
}
