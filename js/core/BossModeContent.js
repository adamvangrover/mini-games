
export const EMAILS = [
    { id: 1, from: "HR Department", subject: "Mandatory Fun Day: Synergy Building", time: "10:30 AM", body: "Dear Team,\n\nAttendance at the mandatory 'Synergy Building' workshop is required. We will be constructing towers out of spaghetti and marshmallows to symbolize our fragile infrastructure.\n\nRegard,\nHR", read: false },
    { id: 2, from: "Michael Scott", subject: "URGENT: Q3 Projections needed ASAP", time: "09:15 AM", body: "Where are those numbers? The board meeting started 5 minutes ago! I need you to invent... I mean, calculate the growth vectors immediately!", read: true },
    { id: 3, from: "IT Support", subject: "Scheduled Maintenance: 2AM - 4AM", time: "Yesterday", body: "Please save your work. We are upgrading the mainframe to Windows 95.", read: true },
    { id: 4, from: "Karen from Accounting", subject: "Re: Receipts??", time: "Yesterday", body: "I'm still waiting for the receipts from that 'Client Lunch' at the arcade. A high score is not a tax deduction.", read: false },
    { id: 5, from: "IT Security", subject: "Phishing Test Failed", time: "2 Days Ago", body: "You clicked the link. Please report to Room 101 for mandatory re-education on why 'FreeCatVideos.exe' is suspicious.", read: true },
    { id: 6, from: "The CEO", subject: "Vision 2030", time: "Last Week", body: "We are pivoting to AI-driven blockchain cloud serverless synergy. What does that mean? Nobody knows, but it sounds expensive.", read: true }
];

export const DOCUMENTS = [
    {
        title: "Meeting_Minutes_Q3.docx",
        content: `MINUTES OF THE QUARTERLY SYNERGY MEETING
Date: Oct 24, 2023
Attendees: All Survivors

1. OPENING REMARKS
The meeting commenced with 15 minutes of trying to get the projector to work.

2. KEY DELIVERABLES
- Project "Titan" is delayed indefinitely due to "vibes".
- The coffee machine is now a paid DLC.

3. ACTION ITEMS
- Circle back on the low-hanging fruit.
- Drill down into the value-add propositions.
- Touch base offline about the online initiatives.`
    },
    {
        title: "Resignation_Draft_v12.docx",
        content: `To Whom It May Concern,

Please accept this letter as formal notification that I am resigning from my position as [Job Title]. My last day will be [Date].

I have decided to pursue my true passion: becoming a professional Tetris player. The skills I learned here—specifically fitting too many tasks into too little time—will serve me well.

Sincerely,
[Name]`
    },
    {
        title: "Project_Alpha_Specs.docx",
        content: `CONFIDENTIAL
Project Alpha Specification

Objective: Disrupt the industry by inventing a solution to a problem nobody has.

Features:
- Blockchain integration (because why not?)
- AI-powered toaster support
- Dark mode (revolutionary)

Budget: $0 (We are a lean startup inside a mega-corp)`
    }
];

export const SLIDES = [
    { title: "Q4 Strategy Alignment", bullets: ["Synergize backward overflow", "Leverage holistic paradigms", "Drill down into cross-media value"] },
    { title: "Growth Vectors", bullets: ["Organic upscale engagement", "Hyper-local bandwidth", "Touch-base with key stakeholders"] },
    { title: "Risk Analysis", bullets: ["Mitigate mission-critical fallout", "Pivot to agile deliverables", "Right-size the human capital"] },
    { title: "The Future", bullets: ["AI", "Blockchain", "Synergy", "Buzzwords"] }
];

export const CHATS = {
    'general': [
        { user: 'Manager', time: '9:00 AM', text: 'Good morning team. Let\'s crush it today.' },
        { user: 'Alice', time: '9:02 AM', text: 'Has anyone seen the updated slide deck?' },
        { user: 'Bob', time: '9:05 AM', text: 'I think it\'s on the shared drive under "Do Not Delete".' },
        { user: 'Manager', time: '9:10 AM', text: '@Bob great catch. Let\'s circle back on that.' }
    ],
    'random': [
        { user: 'Dave', time: '11:00 AM', text: 'Tacos for lunch?' },
        { user: 'Eve', time: '11:01 AM', text: 'Always.' },
        { user: 'Frank', time: '11:05 AM', text: 'I brought leftovers :(' }
    ]
};

export const TERMINAL_ADVENTURE = {
    'start': {
        text: "You are standing in your CUBICLE. To the NORTH is the BREAKROOM. To the EAST is the BOSS'S OFFICE. To the WEST is the SERVER ROOM.",
        exits: { 'n': 'breakroom', 'e': 'boss_office', 'w': 'server_room' }
    },
    'breakroom': {
        text: "You are in the BREAKROOM. The coffee pot is empty. There is a stale DONUT here. Exits: SOUTH.",
        exits: { 's': 'start' },
        items: ['donut']
    },
    'boss_office': {
        text: "You are in the BOSS'S OFFICE. It smells of fear and expensive cologne. There is a GOLDEN STAPLER on the desk. Exits: WEST.",
        exits: { 'w': 'start' },
        items: ['stapler']
    },
    'server_room': {
        text: "You are in the SERVER ROOM. It is cold and noisy. A red light is blinking ominously. Exits: EAST.",
        exits: { 'e': 'start' }
    }
};
