import type { Connection, Member, Viewer, WeeklySlot } from "../types";
import { unsplash } from "./photos";

/**
 * Seeded community. Times are expressed relative to "now" so the network
 * always feels alive: people are open for the next hour, joined last week, etc.
 */

type Day = WeeklySlot["day"];
type SeedMember = Omit<
  Member,
  "availability" | "joinedAt" | "weeklyAvailability" | "verified"
> & {
  /** Minutes the open window has left; null = open until switched off. */
  openFor?: number | null;
  status: Member["availability"]["status"];
  joinedDaysAgo: number;
  weekly: Array<[Day, string, string]>;
  verified?: boolean;
};

const weekdays = (start: string, end: string): Array<[Day, string, string]> =>
  ([1, 2, 3, 4, 5] as Day[]).map((d) => [d, start, end]);

const SEED: SeedMember[] = [
  {
    id: "maddison",
    name: "Maddison Hale",
    avatarUrl: unsplash("1494790108377-be9c29b29330"),
    headline:
      "Passionate about spreading kindness, connecting with like-minded people, and sharing her journey with chronic illness to inspire others",
    whatIDo:
      "Hosts Spoonful, a podcast and peer circle for young people living with chronic illness.",
    bio: "I was diagnosed with lupus at 19 and spent two years feeling like the only person my age who cancelled plans because of a flare. Spoonful started as a voice memo to a friend and is now 40 episodes and a weekly peer circle. I'm looking for people who build community for a living, anyone who has grown a podcast past word of mouth, and fellow 'spoonies' who want to compare notes.",
    city: "London",
    countryCode: "GB",
    timezone: "Europe/London",
    interests: ["Storytelling", "Podcasting", "Kindness", "Peer support"],
    impactAreas: ["Health", "Mental health", "Community"],
    skills: ["Audio production", "Facilitation", "Writing"],
    projects: [
      {
        name: "Spoonful",
        description:
          "Weekly podcast and peer circle for 18–30s with chronic illness. 40 episodes, 1,200 listeners a week.",
      },
      {
        name: "Flare Kit",
        description:
          "A free printable guide friends can use to support someone during a flare.",
      },
    ],
    linkedinUrl: "https://www.linkedin.com/",
    instagramUrl: "https://www.instagram.com/",
    onlineStatus: "online",
    status: "open",
    openFor: 90,
    joinedDaysAgo: 64,
    weekly: [
      [1, "10:00", "12:00"],
      [3, "14:00", "17:00"],
      [5, "10:00", "13:00"],
    ],
    calendarConnected: true,
    jumpInPolicy: "anyone",
  },
  {
    id: "kyle",
    name: "Kyle Brennan",
    avatarUrl: unsplash("1500648767791-00dcc994a43e"),
    headline:
      "A health advocate passionate about mentorship and collaborating on wellbeing projects to build healthier communities",
    whatIDo:
      "Runs Walk & Talk, free Saturday morning walking groups for men who find it hard to talk about how they're doing.",
    bio: "Former paramedic. After a rough year I noticed I only opened up when I was walking next to someone, not sitting across from them. Walk & Talk now runs in six Vancouver neighbourhoods with volunteer leads. I mentor new leads, and I'd love to meet anyone thinking about men's mental health, running clubs, or how to scale something volunteer-run without losing its warmth.",
    city: "Vancouver",
    countryCode: "CA",
    timezone: "America/Vancouver",
    interests: ["Running", "Mentorship", "Men's health", "Outdoors"],
    impactAreas: ["Mental health", "Health", "Community"],
    skills: ["Community building", "Coaching", "First aid"],
    projects: [
      {
        name: "Walk & Talk",
        description:
          "Six weekly walking groups across Vancouver, run by 14 volunteer leads.",
      },
    ],
    linkedinUrl: "https://www.linkedin.com/",
    instagramUrl: "https://www.instagram.com/",
    onlineStatus: "online",
    status: "open",
    openFor: 45,
    joinedDaysAgo: 120,
    weekly: [
      [2, "17:00", "19:00"],
      [4, "17:00", "19:00"],
      [6, "11:00", "13:00"],
    ],
    calendarConnected: true,
    jumpInPolicy: "anyone",
  },
  {
    id: "sarah",
    name: "Sarah Chen",
    avatarUrl: unsplash("1580489944761-15a19d654956"),
    headline: "Product designer building tools for climate action.",
    whatIDo:
      "Designing Tally, an app that turns a household's energy bill into three actions worth doing this month.",
    bio: "Eight years designing fintech, then a heat dome summer made me quit to work on climate full time. I think the gap in climate isn't information, it's the last metre between caring and doing. Happy to give design feedback to anyone working on impact, and always keen to meet energy nerds, behavioural scientists and people who've shipped to non-technical users.",
    city: "Vancouver",
    countryCode: "CA",
    timezone: "America/Vancouver",
    interests: ["Design", "Behaviour change", "Energy", "Cycling"],
    impactAreas: ["Climate", "Technology"],
    skills: ["Product design", "User research", "Prototyping"],
    projects: [
      {
        name: "Tally",
        description:
          "Energy bill → three concrete actions. In beta with 300 households in BC.",
      },
      {
        name: "Design for Good office hours",
        description: "Free 30-minute design reviews for nonprofits, every other Friday.",
      },
    ],
    linkedinUrl: "https://www.linkedin.com/",
    websiteUrl: "https://example.com/",
    onlineStatus: "online",
    status: "open",
    openFor: 120,
    joinedDaysAgo: 9,
    weekly: [
      [1, "09:00", "12:00"],
      [2, "14:00", "17:00"],
      [5, "13:00", "15:00"],
    ],
    calendarConnected: true,
    jumpInPolicy: "anyone",
  },
  {
    id: "josh",
    name: "Josh Whitaker",
    avatarUrl: unsplash("1757744705465-ea08b0ddc38a"),
    headline:
      "Passionate about protecting the environment, wants to explore volunteering opportunities to make a positive impact, and is seeking mentorship.",
    whatIDo:
      "Marine science student who organises monthly reef and beach clean-ups along Sydney's northern beaches.",
    bio: "Third-year marine science at UNSW. Our clean-up crew went from four mates to 120 people last month and I have no idea how to run something that big. I'm looking for a mentor who has grown a volunteer group, and anyone working on ocean plastics who wants extra hands for fieldwork.",
    city: "Sydney",
    countryCode: "AU",
    timezone: "Australia/Sydney",
    interests: ["Ocean", "Diving", "Volunteering", "Mentorship"],
    impactAreas: ["Climate", "Community", "Education"],
    skills: ["Event organising", "Field research", "Social media"],
    projects: [
      {
        name: "Northern Beaches Clean Crew",
        description: "Monthly clean-ups. 1.4 tonnes of rubbish collected this year.",
      },
    ],
    linkedinUrl: "https://www.linkedin.com/",
    instagramUrl: "https://www.instagram.com/",
    onlineStatus: "offline",
    status: "later",
    joinedDaysAgo: 4,
    weekly: [
      [2, "07:00", "09:00"],
      [4, "07:00", "09:00"],
      [1, "18:00", "20:00"],
    ],
    calendarConnected: false,
    jumpInPolicy: "anyone",
  },
  {
    id: "mark",
    name: "Mark Delacroix",
    avatarUrl: unsplash("1507003211169-0a1dd7228f2d"),
    headline:
      "I'm all about health and wellness and looking to find some volunteer projects that make a real difference in our communities",
    whatIDo:
      "Physiotherapist who runs a free Sunday clinic for people who can't afford rehab after an injury.",
    bio: "I've been a physio for eleven years. The people who need rehab most are often the ones who can't take time off or pay for it, so I started a Sunday clinic in a church basement. We now have five volunteer physios. Looking for people in health equity, anyone who's navigated charity registration in Ontario, and other clinicians who want to volunteer.",
    city: "Toronto",
    countryCode: "CA",
    timezone: "America/Toronto",
    interests: ["Wellness", "Sport", "Volunteering"],
    impactAreas: ["Health", "Economic opportunity", "Community"],
    skills: ["Physiotherapy", "Clinic operations", "Teaching"],
    projects: [
      {
        name: "Sunday Clinic",
        description: "Free physiotherapy every Sunday. 600 appointments this year.",
      },
    ],
    linkedinUrl: "https://www.linkedin.com/",
    instagramUrl: "https://www.instagram.com/",
    onlineStatus: "online",
    status: "later",
    joinedDaysAgo: 210,
    weekly: weekdays("18:00", "20:00"),
    calendarConnected: true,
    jumpInPolicy: "anyone",
  },
  {
    id: "ally",
    name: "Ally van Wyk",
    avatarUrl: unsplash("1662850886700-4ec19bd30d11"),
    headline:
      "Health is my jam! I'd love to connect with like-minded folks who are into spreading wellness vibes and building healthier communities",
    whatIDo:
      "Founder of Breathe Khayelitsha, free yoga and breathwork classes run by and for young people in Khayelitsha.",
    bio: "I trained as a yoga teacher in Cape Town and was frustrated that every studio was in the same five suburbs. Breathe started with one mat in a community hall. Now twelve young instructors teach there, and they get paid. I'd love to talk to anyone who has built a social enterprise that pays its community, and people working on youth mental health.",
    city: "Cape Town",
    countryCode: "ZA",
    timezone: "Africa/Johannesburg",
    interests: ["Yoga", "Breathwork", "Youth", "Wellness"],
    impactAreas: ["Health", "Mental health", "Economic opportunity"],
    skills: ["Teaching", "Training trainers", "Fundraising"],
    projects: [
      {
        name: "Breathe Khayelitsha",
        description: "Free classes taught by 12 paid youth instructors.",
      },
    ],
    linkedinUrl: "https://www.linkedin.com/",
    instagramUrl: "https://www.instagram.com/",
    onlineStatus: "online",
    status: "open",
    openFor: 60,
    joinedDaysAgo: 33,
    weekly: [
      [2, "08:00", "10:00"],
      [4, "08:00", "10:00"],
      [6, "17:00", "19:00"],
    ],
    calendarConnected: false,
    jumpInPolicy: "anyone",
  },
  {
    id: "gita",
    name: "Gita Sharma",
    avatarUrl: unsplash("1544005313-94ddf0286df2"),
    headline:
      "I'm super passionate about wellness and would love to find a mentor who can help me make a bigger impact in health-related projects",
    whatIDo:
      "Public health grad running a nutrition program that teaches newcomer families to cook on a budget with Canadian groceries.",
    bio: "My family moved to Montréal when I was eleven and my mum spent the first year trying to cook her food with ingredients she didn't recognise. Table Talk runs cooking nights at three community centres. I'm early in my career and looking for a mentor in public health, plus anyone running food programs who wants to swap recipes and funding leads.",
    city: "Montréal",
    countryCode: "CA",
    timezone: "America/Toronto",
    interests: ["Cooking", "Nutrition", "Newcomers", "Mentorship"],
    impactAreas: ["Health", "Food systems", "Community"],
    skills: ["Program design", "Nutrition", "French"],
    projects: [
      {
        name: "Table Talk",
        description: "Budget cooking nights for newcomer families at three community centres.",
      },
    ],
    linkedinUrl: "https://www.linkedin.com/",
    instagramUrl: "https://www.instagram.com/",
    onlineStatus: "online",
    status: "open",
    openFor: 30,
    joinedDaysAgo: 2,
    weekly: [
      [1, "12:00", "13:00"],
      [3, "12:00", "13:00"],
      [4, "18:00", "20:00"],
    ],
    calendarConnected: true,
    jumpInPolicy: "anyone",
  },
  {
    id: "tony",
    name: "Tony Nguyen",
    avatarUrl: unsplash("1576110598658-096ae24cdb97"),
    headline:
      "Big on sustainability and always up for new volunteer projects that help protect the planet and bring people together",
    whatIDo:
      "Coordinates a network of eleven repair cafés across Greater Manchester.",
    bio: "Software tester by day. At weekends I help people fix toasters, bikes and jumpers instead of binning them. Repair cafés are secretly the best community spaces there are: people come for a broken lamp and stay for the tea. I want to meet people working on circular economy policy, and anyone who wants to start a repair café in their town.",
    city: "Manchester",
    countryCode: "GB",
    timezone: "Europe/London",
    interests: ["Repair", "Circular economy", "Electronics", "Tea"],
    impactAreas: ["Climate", "Community"],
    skills: ["Electronics repair", "Volunteer coordination", "QA testing"],
    projects: [
      {
        name: "Fix It Manchester",
        description: "11 repair cafés, 3,000 items saved from landfill this year.",
      },
    ],
    linkedinUrl: "https://www.linkedin.com/",
    instagramUrl: "https://www.instagram.com/",
    onlineStatus: "offline",
    status: "later",
    joinedDaysAgo: 88,
    weekly: [
      [2, "19:00", "21:00"],
      [6, "10:00", "12:00"],
    ],
    calendarConnected: false,
    jumpInPolicy: "anyone",
  },
  {
    id: "vasi",
    name: "Vasi Petrakis",
    avatarUrl: unsplash("1581714161666-dade083654ae"),
    headline:
      "Looking to connect with people who are into sustainability! Let's find some green projects we can work on together",
    whatIDo:
      "Urban beekeeper turning unused rooftops into pollinator gardens with building residents.",
    bio: "I keep 22 hives on rooftops around East Van, and the honey is honestly the least interesting part. Every roof garden becomes a reason for neighbours who've never spoken to meet. I'm looking for landlords, strata councils and anyone working on urban biodiversity or green roofs.",
    city: "Vancouver",
    countryCode: "CA",
    timezone: "America/Vancouver",
    interests: ["Beekeeping", "Gardening", "Cities", "Biodiversity"],
    impactAreas: ["Climate", "Community", "Food systems"],
    skills: ["Beekeeping", "Landscape design", "Workshops"],
    projects: [
      {
        name: "Rooftop Pollinators",
        description: "22 hives and 9 rooftop gardens maintained with residents.",
      },
    ],
    linkedinUrl: "https://www.linkedin.com/",
    instagramUrl: "https://www.instagram.com/",
    onlineStatus: "online",
    status: "unavailable",
    joinedDaysAgo: 45,
    weekly: [
      [3, "10:00", "12:00"],
      [6, "09:00", "11:00"],
    ],
    calendarConnected: true,
    jumpInPolicy: "anyone",
  },
  {
    id: "ben",
    name: "Ben Mokoena",
    avatarUrl: unsplash("1651684215020-f7a5b6610f23"),
    headline:
      "Into eco-friendly living and hoping to find a mentor who can guide me in making a real difference for the environment",
    whatIDo:
      "Solar installer apprentice building plug-in solar kits for township schools.",
    bio: "Load-shedding means kids in my old school do homework by candlelight. I'm an apprentice installer and I've built four small solar kits with second-hand panels for classrooms in Soweto. I want to turn this into a proper program, so I'm looking for a mentor in renewable energy and anyone who knows how schools get equipment funded.",
    city: "Johannesburg",
    countryCode: "ZA",
    timezone: "Africa/Johannesburg",
    interests: ["Solar", "Education", "Engineering", "Mentorship"],
    impactAreas: ["Climate", "Education", "Economic opportunity"],
    skills: ["Electrical installation", "Hardware", "Isizulu"],
    projects: [
      {
        name: "Lights On",
        description: "Plug-in solar kits for classrooms. 4 schools so far.",
      },
    ],
    linkedinUrl: "https://www.linkedin.com/",
    instagramUrl: "https://www.instagram.com/",
    onlineStatus: "online",
    status: "open",
    openFor: 75,
    joinedDaysAgo: 6,
    weekly: [
      [1, "16:00", "18:00"],
      [3, "16:00", "18:00"],
    ],
    calendarConnected: false,
    jumpInPolicy: "anyone",
  },
  {
    id: "ella",
    name: "Ella Parata",
    avatarUrl: unsplash("1562337404-3044c84ac061"),
    headline:
      "I'm all about spreading kindness and want to find some volunteer opportunities that bring positivity to our communities",
    whatIDo:
      "Organises Long Table, monthly street dinners where neighbours who've never met eat together.",
    bio: "Long Table started when I realised I'd lived on my street for three years and knew two names. We put tables down the middle of the road, everyone brings a dish, and the council now closes the street for us. It's running on nine streets in Auckland. I'd love to meet anyone fighting loneliness, and anyone who wants to start a Long Table where they live.",
    city: "Auckland",
    countryCode: "NZ",
    timezone: "Pacific/Auckland",
    interests: ["Kindness", "Food", "Neighbours", "Events"],
    impactAreas: ["Community", "Mental health", "Food systems"],
    skills: ["Event organising", "Council permits", "Hosting"],
    projects: [
      {
        name: "Long Table",
        description: "Monthly street dinners on nine Auckland streets.",
      },
    ],
    linkedinUrl: "https://www.linkedin.com/",
    instagramUrl: "https://www.instagram.com/",
    onlineStatus: "offline",
    status: "later",
    joinedDaysAgo: 150,
    weekly: [
      [2, "18:00", "20:00"],
      [5, "12:00", "14:00"],
    ],
    calendarConnected: false,
    jumpInPolicy: "anyone",
  },
  {
    id: "kacy",
    name: "Kacy Morgan",
    avatarUrl: unsplash("1607990283143-e81e7a2c9349"),
    headline:
      "I love connecting with people who are into spreading good vibes! Let's find ways to make the world a little brighter together",
    whatIDo:
      "Runs free after-school art workshops in Melbourne's western suburbs.",
    bio: "Illustrator and part-time art teacher. Brightside runs art afternoons for kids whose schools cut art classes, and the kids' work gets printed on tram-stop posters each term. I'm keen to meet other artists doing community work, people in youth programs, and anyone with print production know-how.",
    city: "Melbourne",
    countryCode: "AU",
    timezone: "Australia/Melbourne",
    interests: ["Illustration", "Kids", "Public art", "Good vibes"],
    impactAreas: ["Education", "Community", "Human potential"],
    skills: ["Illustration", "Teaching", "Print design"],
    projects: [
      {
        name: "Brightside",
        description: "After-school art workshops. Kids' work goes up at tram stops.",
      },
    ],
    linkedinUrl: "https://www.linkedin.com/",
    instagramUrl: "https://www.instagram.com/",
    onlineStatus: "offline",
    status: "unavailable",
    joinedDaysAgo: 19,
    weekly: [
      [3, "08:00", "10:00"],
      [6, "09:00", "11:00"],
      [1, "16:00", "17:30"],
    ],
    calendarConnected: false,
    jumpInPolicy: "anyone",
  },
  {
    id: "amara",
    name: "Amara Okafor",
    avatarUrl: unsplash("1745434159123-4908d0b9df94"),
    headline: "Filmmaker telling climate stories through the people living them.",
    whatIDo:
      "Directing Rising, a documentary series about coastal towns in West Africa adapting to sea-level rise.",
    bio: "I make short documentaries. I'm tired of climate films that are all ice caps and statistics, so Rising follows a fisherwoman, a mayor and a teenage engineer in three towns over two years. Episode one screens at festivals this autumn. Looking for impact producers, people who know distribution, and scientists who want to help get the facts right.",
    city: "Lagos",
    countryCode: "NG",
    timezone: "Africa/Lagos",
    interests: ["Documentary", "Storytelling", "Oceans", "Photography"],
    impactAreas: ["Climate", "Community"],
    skills: ["Directing", "Editing", "Impact campaigns"],
    projects: [
      {
        name: "Rising",
        description: "Documentary series on coastal climate adaptation in West Africa.",
      },
    ],
    linkedinUrl: "https://www.linkedin.com/",
    instagramUrl: "https://www.instagram.com/",
    websiteUrl: "https://example.com/",
    onlineStatus: "online",
    status: "open",
    openFor: null,
    joinedDaysAgo: 27,
    weekly: [
      [2, "14:00", "16:00"],
      [3, "17:00", "19:00"],
      [4, "14:00", "16:00"],
    ],
    calendarConnected: true,
    jumpInPolicy: "anyone",
  },
  {
    id: "diego",
    name: "Diego Alvarez",
    avatarUrl: unsplash("1625241152315-4a698f74ceb7"),
    headline: "Developer building open-source tools so cities can publish their budgets in plain language.",
    whatIDo:
      "Maintains Presupuesto Abierto, open-source civic infrastructure used by 14 municipalities.",
    bio: "I left a bank to write software for city halls. Presupuesto Abierto takes the PDF budget nobody reads and turns it into something a resident can explore on their phone. It's all open source and I'm always looking for contributors, civic tech folks from other countries, and journalists who want to use the data.",
    city: "Mexico City",
    countryCode: "MX",
    timezone: "America/Mexico_City",
    interests: ["Open source", "Civic tech", "Data", "Spanish"],
    impactAreas: ["Technology", "Community", "Economic opportunity"],
    skills: ["TypeScript", "Data engineering", "Open-source maintenance"],
    projects: [
      {
        name: "Presupuesto Abierto",
        description: "Plain-language city budgets. Used by 14 municipalities.",
        url: "https://github.com/",
      },
    ],
    linkedinUrl: "https://www.linkedin.com/",
    websiteUrl: "https://github.com/",
    onlineStatus: "online",
    status: "open",
    openFor: 50,
    joinedDaysAgo: 73,
    weekly: weekdays("10:00", "11:00"),
    calendarConnected: true,
    jumpInPolicy: "anyone",
  },
  {
    id: "priya",
    name: "Priya Raman",
    avatarUrl: unsplash("1592275772614-ec71b19e326f"),
    headline: "AI researcher figuring out how tutors and models can teach together.",
    whatIDo:
      "Researches AI tutoring at a learning lab, working with teachers in public schools.",
    bio: "My PhD was in machine learning, but my favourite job was tutoring maths in high school. Now I study when an AI tutor helps and when it quietly gets in the way of learning, alongside the teachers who actually use it. I'd love to meet teachers, edtech founders who care about evidence, and anyone running tutoring programs.",
    city: "Boston",
    countryCode: "US",
    timezone: "America/New_York",
    interests: ["AI", "Learning science", "Maths", "Teaching"],
    impactAreas: ["Education", "Technology", "Human potential"],
    skills: ["Machine learning", "Research design", "Python"],
    projects: [
      {
        name: "Tutor + Model study",
        description: "Year-long study with 30 teachers on AI-assisted tutoring.",
      },
    ],
    linkedinUrl: "https://www.linkedin.com/",
    websiteUrl: "https://example.com/",
    onlineStatus: "offline",
    status: "later",
    joinedDaysAgo: 51,
    weekly: [
      [2, "13:00", "15:00"],
      [4, "13:00", "15:00"],
    ],
    calendarConnected: true,
    jumpInPolicy: "met",
  },
  {
    id: "hana",
    name: "Hana Kim",
    avatarUrl: unsplash("1758337082707-e3fbd71ed461"),
    headline: "Getting surplus farm produce to food banks before it goes to waste.",
    whatIDo:
      "Co-founder of Second Harvest Run, a logistics app matching farms' surplus with food banks and volunteer drivers.",
    bio: "My parents run a farm in the Skagit Valley and every summer we ploughed perfectly good vegetables back into the field because nobody could pick them up in time. Second Harvest Run moves 8 tonnes a week now. Looking for food bank operators, logistics people, and other founders working on food waste.",
    city: "Seattle",
    countryCode: "US",
    timezone: "America/Los_Angeles",
    interests: ["Farming", "Logistics", "Food waste"],
    impactAreas: ["Food systems", "Climate", "Community"],
    skills: ["Operations", "Fundraising", "Partnerships"],
    projects: [
      {
        name: "Second Harvest Run",
        description: "8 tonnes of surplus produce a week from 40 farms to 25 food banks.",
      },
    ],
    linkedinUrl: "https://www.linkedin.com/",
    instagramUrl: "https://www.instagram.com/",
    onlineStatus: "online",
    status: "open",
    openFor: 25,
    joinedDaysAgo: 1,
    weekly: [
      [1, "15:00", "17:00"],
      [3, "15:00", "17:00"],
    ],
    calendarConnected: true,
    jumpInPolicy: "anyone",
  },
  {
    id: "marcus",
    name: "Marcus Bell",
    avatarUrl: unsplash("1757700314602-d0971e793203"),
    headline: "Impact investor backing first-time founders in overlooked places.",
    whatIDo:
      "Partner at a small fund writing first cheques for climate and health founders outside the big tech hubs.",
    bio: "Thirty years in banking, the last ten trying to undo some of it. I invest in founders who don't have a warm intro to anyone, so JumpIn suits me. I keep office hours for founders every week and I'm happy to review a pitch, but I'm just as happy to talk about fly fishing.",
    city: "Oakland",
    countryCode: "US",
    timezone: "America/Los_Angeles",
    interests: ["Investing", "Mentorship", "Fly fishing"],
    impactAreas: ["Economic opportunity", "Climate", "Health"],
    skills: ["Fundraising", "Financial modelling", "Board governance"],
    projects: [
      {
        name: "Founder office hours",
        description: "Weekly 30-minute sessions for first-time founders. No warm intro needed.",
      },
    ],
    linkedinUrl: "https://www.linkedin.com/",
    onlineStatus: "online",
    status: "later",
    joinedDaysAgo: 300,
    weekly: [
      [2, "09:00", "11:00"],
      [4, "09:00", "11:00"],
    ],
    calendarConnected: true,
    jumpInPolicy: "met",
  },
  {
    id: "leila",
    name: "Leila Haddad",
    avatarUrl: unsplash("1779338192178-e9333695d868"),
    headline: "Building mental health support that feels like talking to a friend, not filling in a form.",
    whatIDo:
      "Founder of Nour, a text-based peer support line for Arabic-speaking young people in North America.",
    bio: "Clinical psychologist turned founder. Young people in my community weren't calling helplines in English, so we built one they'd actually text, staffed by trained peer volunteers with clinical backup. I'd love to meet people in crisis support, trust and safety, and other founders building in mental health.",
    city: "Montréal",
    countryCode: "CA",
    timezone: "America/Toronto",
    interests: ["Psychology", "Languages", "Peer support"],
    impactAreas: ["Mental health", "Health", "Community"],
    skills: ["Clinical psychology", "Volunteer training", "Arabic"],
    projects: [
      {
        name: "Nour",
        description: "Peer support by text in Arabic and English. 900 conversations a month.",
      },
    ],
    linkedinUrl: "https://www.linkedin.com/",
    onlineStatus: "offline",
    status: "unavailable",
    joinedDaysAgo: 40,
    weekly: [[3, "11:00", "12:00"]],
    calendarConnected: true,
    jumpInPolicy: "met",
  },
  {
    id: "noa",
    name: "Noa Ferreira",
    avatarUrl: unsplash("1604072366595-e75dc92d6bdc"),
    headline: "Artist painting neighbourhood murals designed by the people who live there.",
    whatIDo:
      "Leads Paredes, a community mural project where residents design the walls and paint them together.",
    bio: "I paint big. Paredes started with one wall in Marvila. The neighbours voted on the design, a grandmother mixed the paint, and the kids did the sky. We've done seven walls since. I want to meet other artists in community work, urban planners, and anyone who thinks public space should look like the people who use it.",
    city: "Lisbon",
    countryCode: "PT",
    timezone: "Europe/Lisbon",
    interests: ["Murals", "Public space", "Colour", "Workshops"],
    impactAreas: ["Community", "Human potential"],
    skills: ["Painting", "Facilitation", "Portuguese"],
    projects: [
      {
        name: "Paredes",
        description: "Resident-designed murals. Seven walls in Lisbon so far.",
      },
    ],
    instagramUrl: "https://www.instagram.com/",
    websiteUrl: "https://example.com/",
    onlineStatus: "online",
    status: "open",
    openFor: 100,
    joinedDaysAgo: 12,
    weekly: [
      [2, "17:00", "19:00"],
      [5, "15:00", "17:00"],
    ],
    calendarConnected: false,
    jumpInPolicy: "anyone",
  },
  {
    id: "theo",
    name: "Theo Martin",
    avatarUrl: unsplash("1595152772835-219674b2a8a6"),
    headline: "19, organising young people to show up at city council meetings.",
    whatIDo:
      "Co-founder of Show Up Chicago, which trains high schoolers to speak at public meetings.",
    bio: "In my junior year our school lost its only bus route and nobody under 18 was at the meeting where it was cut. Show Up trains students to testify, and 200 of them have now spoken at council. I'm looking for older organisers who'll tell me what I'm getting wrong, and people building youth civic programs in other cities.",
    city: "Chicago",
    countryCode: "US",
    timezone: "America/Chicago",
    interests: ["Organising", "Public speaking", "Transit", "Basketball"],
    impactAreas: ["Community", "Education", "Human potential"],
    skills: ["Organising", "Public speaking", "Training"],
    projects: [
      {
        name: "Show Up Chicago",
        description: "200 students trained to testify at city council.",
      },
    ],
    linkedinUrl: "https://www.linkedin.com/",
    instagramUrl: "https://www.instagram.com/",
    onlineStatus: "online",
    status: "open",
    openFor: 40,
    joinedDaysAgo: 3,
    weekly: [
      [1, "16:00", "18:00"],
      [3, "16:00", "18:00"],
    ],
    calendarConnected: false,
    jumpInPolicy: "anyone",
  },
];

/** The demo account. Copy taken from the "John" card in the original mockups. */
const DEMO_VIEWER = {
  id: "me",
  name: "John Ellis",
  avatarUrl: unsplash("1595211877493-41a4e5f236b3"),
  headline:
    "On a mission to spread joy, and I'm hoping to find a mentor who can help me do even more to uplift others",
  whatIDo:
    "Runs a volunteer program that pairs university students with isolated seniors for weekly visits.",
  bio: "Social worker by training. Buddy Up started with my grandad and three of my classmates and now pairs 80 students with seniors around Vancouver. I want to grow it without losing what makes it work, so I'm looking for mentors who've scaled volunteer programs and anyone working on loneliness.",
  city: "Vancouver",
  countryCode: "CA",
  timezone: "America/Vancouver",
  interests: ["Mentorship", "Volunteering", "Kindness", "Running"],
  impactAreas: ["Community", "Mental health", "Health"],
  skills: ["Program design", "Volunteer coordination", "Facilitation"],
  projects: [
    {
      name: "Buddy Up",
      description: "Pairs 80 university students with isolated seniors for weekly visits.",
    },
  ],
  linkedinUrl: "https://www.linkedin.com/",
  instagramUrl: "https://www.instagram.com/",
  email: "john.demo@jumpin.example",
};

const minutes = (n: number) => n * 60_000;
const days = (n: number) => n * 86_400_000;

function toMember(seed: SeedMember, now: number): Member {
  const { openFor, status, joinedDaysAgo, weekly, verified, ...rest } = seed;
  return {
    ...rest,
    verified: verified ?? Boolean(rest.linkedinUrl),
    availability:
      status === "open"
        ? {
            status,
            openUntil:
              openFor === null || openFor === undefined
                ? undefined
                : new Date(now + minutes(openFor)).toISOString(),
          }
        : { status },
    weeklyAvailability: weekly.map(([day, start, end], i) => ({
      id: `${seed.id}-w${i}`,
      day,
      start,
      end,
    })),
    joinedAt: new Date(now - days(joinedDaysAgo)).toISOString(),
  };
}

export function buildSeedMembers(now = Date.now()): Member[] {
  return SEED.map((m) => toMember(m, now));
}

export function buildDemoViewer(now = Date.now()): Viewer {
  return {
    ...DEMO_VIEWER,
    onlineStatus: "online",
    availability: { status: "open", openUntil: new Date(now + minutes(60)).toISOString() },
    weeklyAvailability: [
      { id: "me-w0", day: 1, start: "09:00", end: "12:00" },
      { id: "me-w1", day: 2, start: "14:00", end: "17:00" },
      { id: "me-w2", day: 4, start: "10:00", end: "12:00" },
    ],
    calendarConnected: false,
    jumpInPolicy: "anyone",
    verified: true,
    joinedAt: new Date(now - days(30)).toISOString(),
    profileHidden: false,
    onboarded: true,
  };
}

/** A blank profile for someone who just signed up and hasn't onboarded. */
export function buildNewViewer(
  init: { name?: string; email?: string; avatarUrl?: string; verified?: boolean },
  now = Date.now(),
): Viewer {
  return {
    id: "me",
    name: init.name ?? "",
    avatarUrl: init.avatarUrl ?? "",
    headline: "",
    whatIDo: "",
    bio: "",
    city: "",
    countryCode: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    interests: [],
    impactAreas: [],
    skills: [],
    projects: [],
    email: init.email ?? "",
    onlineStatus: "online",
    availability: { status: "later" },
    weeklyAvailability: [
      { id: "me-w0", day: 2, start: "12:00", end: "14:00" },
      { id: "me-w1", day: 4, start: "12:00", end: "14:00" },
    ],
    calendarConnected: false,
    jumpInPolicy: "anyone",
    verified: init.verified ?? false,
    joinedAt: new Date(now).toISOString(),
    profileHidden: false,
    onboarded: false,
  };
}

/** History for the demo account: John has met Maddison and Kyle before. */
export function buildDemoConnections(now = Date.now()): Connection[] {
  return [
    {
      id: "c-seed-1",
      userId: "me",
      otherUserId: "maddison",
      type: "jumpin",
      status: "completed",
      createdAt: new Date(now - days(5)).toISOString(),
      meetingUrl: "https://meet.google.com/new",
      durationMinutes: 30,
      note: "Hi Maddison, I saw you on JumpIn and I think what you're building is awesome! Would love to learn about it if you're still free to chat.",
      source: "demo",
    },
    {
      id: "c-seed-2",
      userId: "me",
      otherUserId: "kyle",
      type: "scheduled",
      status: "completed",
      createdAt: new Date(now - days(16)).toISOString(),
      scheduledAt: new Date(now - days(14)).toISOString(),
      meetingUrl: "https://meet.google.com/new",
      durationMinutes: 30,
      source: "demo",
    },
  ];
}

export const IMPACT_AREAS = [
  "Climate",
  "Education",
  "Health",
  "Mental health",
  "Economic opportunity",
  "Community",
  "Food systems",
  "Technology",
  "Human potential",
];

export const SUGGESTED_INTERESTS = [
  "Mentorship",
  "Storytelling",
  "Volunteering",
  "Design",
  "Open source",
  "Kindness",
  "Outdoors",
  "Food",
  "Public art",
  "Peer support",
  "Entrepreneurship",
  "Longevity",
];

export const SUGGESTED_SKILLS = [
  "Product design",
  "Fundraising",
  "Community building",
  "Facilitation",
  "Writing",
  "Engineering",
  "Teaching",
  "Operations",
  "Research",
  "Marketing",
];
