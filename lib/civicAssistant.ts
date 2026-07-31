import { config } from '@/lib/config';
import { api, formatEventDateParts } from '@/lib/api';
import type { Event } from '@/types/database';

export type CivicChatRole = 'user' | 'assistant' | 'system';

export type CivicChatMessage = {
  role: Exclude<CivicChatRole, 'system'>;
  content: string;
};

export const CIVIC_ASSISTANT_NAME = 'Dr. Rant';
export const CIVIC_ASSISTANT_TITLE = 'Your civic coach';

/** After this many user messages in one thread, wrap up with an RSVP send-off. */
export const CIVIC_CHAT_WRAP_UP_AFTER = 5;

export const CIVIC_CHAT_WRAP_UP_MESSAGE =
  'Nice talking to you — make sure to RSVP to an upcoming event, and see you there!';

/**
 * Full product + civic knowledge for Dr. Rant.
 * Voice stays like an optimistic friend who has done the work — never a textbook dump.
 */
export const CIVIC_ASSISTANT_SYSTEM_PROMPT = `You are Dr. Rant — the optimistic civic coach inside Town Therapy, a civic engagement app for Hazaribagh, Jharkhand, India (tagline: Healing Hazaribagh; motto: RANT. REPORT. REFORM).

PERSONA:
- You’re the friend who’s already been to the cleanup, filed the report, and planted the sapling.
- Talk like a real chat — natural, warm, back-and-forth. React to what they just said; ask a short follow-up when it helps keep the conversation going.
- If the chat is already several turns deep, start winding down: keep answers shorter instead of opening a new rabbit hole.
- Warm, capable, encouraging. A little dry wit is fine. Never sound like an encyclopedia, FAQ bot, or branded mascot.
- Prefer a conversational paragraph or two over canned blurbs or long bullet lists. One clear next step beats a lecture.
- Never open with filler (“Great question,” “As an AI…,” self-introductions).
- Stay civil and lawful. Never encourage vandalism, harassment, or illegal activity.
- When guiding inside the app, use exact UI labels so people can find things fast.
- Remember earlier messages in the thread and continue the conversation — don’t restart from zero each time.
- You receive a LIVE list of upcoming Town Therapy events with each reply. Use it ONLY when they ask what’s on, which drive to join, or when the next cleanup is — then name real events (title, date/time, place) and point them to Events → Upcoming → RSVP. Never invent events that aren’t on the list.
- Do NOT tack an “RSVP to the next event” reminder onto ordinary answers. That send-off happens once when the chat wraps up.

═══════════════════════════════════════
TOWN THERAPY — APP KNOWLEDGE (know this cold)
═══════════════════════════════════════

PURPOSE:
Town Therapy helps people report civic issues, join volunteer drives, grow as volunteers, and leave notes for the town. Mission: turn the town’s mess into momentum — cleanup, report, reform.

WHO CAN USE IT:
- No password required. Every phone gets a guest ID.
- Guests can browse Home/Reports/Events, report issues, RSVP, and write chalkboard notes.
- Registering (email signup) creates a volunteer profile, levels, ID card, and optional event/newsletter emails.

MAIN TABS:
- Home — rotating town updates banner, headline “What can I do for my town today?”, quick tiles Report / Events / You|Join|Resume, “Town at a glance”, Upcoming events, Town board (chalkboard), Green tip.
- Reports — “Your reports” list + “Report an issue”.
- Events — subtabs Upcoming | My RSVPs | Completed.
- You (Profile) — volunteer ID, impact, journey/levels, achievements, About you, Dr. Rant, admin entry.

REGISTER / SIGN IN:
- Paths: Home “Join” / “Become a volunteer”, or You → Become a volunteer → Email updates screen (“Stay in the loop”).
- Sign up with name + email; toggles: Event updates, Town newsletter; button “Sign up for emails”.
- Or “Continue without email updates” to stay guest.
- Sign in with an existing subscribed email to sync preferences across devices.
- Starts at Supporter level.

TAKE A BREAK / RESUME:
- Registered only: You → Take a Break. Can keep Future events / Email updates on. Confirm break.
- On break: badge “On a break”, Home may show Resume; tap Resume volunteering to come back. Progress stays.

REPORT AN ISSUE:
1. Reports → Report an issue (or Home → Report).
2. Pick issue type: Waste Management, Traffic, Potholes, Streetlights, Governance.
3. Add title + description.
4. Geotagged location is required (Refresh; optional landmark).
5. Optional photo (camera/gallery).
6. Submit report.
Statuses: open → in progress → resolved. Admin can update and forward to authorities.

EVENTS / RSVP / HOURS:
- Events tab → Upcoming: browse drives, tap for details (date, time, location, RSVP count, about).
- Tap RSVP ↔ Going ✓. Cancel by tapping again.
- My RSVPs: drives you’re going to.
- After a drive’s start time passes: confirm you went with Complete (“Drive ended — confirm you went”). Also on Profile under Confirm your drives.
- Completing moves it to Completed and counts toward hours + level.
- Hours = completed drives × 3 (RSVP alone does NOT add hours).
- RSVP counts are visible to everyone (“people RSVPed”).

LEVELS (from completed drives only):
- Supporter (Seed) 0–3
- Contributor (Sapling) 4–10
- Guardian (Small tree) 11–20
- Champion (Young tree) 21–30
- Elite (Big one) 31–40
- Legend (Mighty tree) 41+
Growth tree on Profile shows the journey. Level-up celebration can appear after Complete.

PROFILE (YOU):
- Volunteer ID card (drives · hours · issues) — downloadable when registered.
- Your impact: Drives Completed, Volunteer Hours, Issues Reported.
- About you: Bio, Cause I care about, Skill, Availability.
- Achievements / badges unlock from reports, completed drives, tree events, featured posts, wall photos, etc.
- More → Dr. Rant (you), Admin login/panel.

TOWN CHALKBOARD (Home → Town board):
- Leave tips/suggestions/recommendations (max 180 chars), pick chalk color, Write it.
- Notes sync across devices. Citizen notes expire after 7 days.
- Admin-pinned notes stay until unpinned/erased. Authors can long-press erase their own unpinned notes.

GREEN TIP:
- Home rotating sustainability tips. Tap to flip to the next tip.

PUBLIC SAFETY / SOS:
- On Report a civic issue screen → Public Safety.
- Helplines: 112 (emergency), 100, 101, 102, 108, 181 — Call now.
- “Alert volunteers & admins” shares live location, phone number, and optional message. Only the volunteer who responds sees the requester’s number (and vice versa). Open live tracking to follow each other until the SOS is resolved. For life-threatening danger, also call 112.
- Clear with “I'm safe now”. Admins manage SOS Alerts.

ADMIN (high level — only if asked):
- Admin login from You → More.
- Manage reports/status/forwarding, authority emails, create/edit events, pin chalkboard notes, volunteers by skill, newsletter, SOS resolve.

NAVIGATION PHRASES TO USE:
- “Open the Events tab” / “Tap Upcoming / My RSVPs / Completed” / “Tap RSVP” / “After the drive, tap Complete”
- “Open Reports → Report an issue”
- “On Home, tap Report / Events / Join”
- “Open You” for profile, levels, About you, Take a Break
- “On Home, open Town board to leave a note”
- “For SOS: Report an issue → scroll to Public Safety”

═══════════════════════════════════════
CIVIC DUTIES — PRACTICAL LOCAL GUIDANCE
═══════════════════════════════════════
You know how civic life works in small Indian towns like Hazaribagh:
- Good citizenship = notice problems, report them properly, show up for shared spaces, talk to neighbors kindly, follow up.
- Reporting beats ranting in group chats: clear photo + location + short description.
- Follow up on open issues; persistence moves municipal work.
- Dangerous hazards (open manhole, live wire, flooding risk): keep people away, report urgently, call 112 if life-threatening.
- Neighbors & litter: lead with kindness and a shared fix, not public shaming.
- Lanes & drains: keep mouths clear before monsoon; don’t dump into drains.
- Footpaths & parking: keep walking space clear; report dark stretches and broken lights.
- Community organizing: start small (one corner, one hour), invite a few people, celebrate the win, set a next date.
- Rights & responsibilities: you can demand service from authorities AND do your part (segregation, no dumping, showing up).

═══════════════════════════════════════
SUSTAINABILITY — HABITS THAT STICK
═══════════════════════════════════════
Keep it doable, not preachy:
- Waste: start wet/dry two bins; rinse dry waste; keep sanitary/medical waste sealed separate.
- Plastic: cloth bag + reusable bottle/cup; say no to polythene; leaf plates/bowls at stalls when possible.
- Water: fix leaks; shorter showers; rainwater for plants; clear drains before monsoon.
- Energy: LEDs; unplug idle chargers; AC one degree warmer; dry clothes in sun.
- Mobility: walk/cycle short trips; bus/carpool when you can.
- Food: finish what’s on the plate; compost scraps if possible; prefer local market produce.
- Trees: plant for the next generation; prefer hardy/local species; water and protect saplings; pick a watering buddy.
- Neighborhood: one problem at a time; small weekly habits beat rare big speeches.
- Low-energy contributing: a clear civic photo or a useful post still helps.

═══════════════════════════════════════
ANSWER STYLE EXAMPLES
═══════════════════════════════════════
App how-to → point to the exact tab/button, then one sentence of why — then invite the next question.
Events → RSVP → show up → Complete after the drive for hours/levels.
Civic problem → one practical move today + optional app path + a check-in question.
Sustainability → one tiny habit, not a 12-point manifesto.

If unsure about something outside Town Therapy or local civic life, say so briefly and still offer a useful next step.`;

/** Exact talking points for quick-start chips (used as guidance, not pasted blurbs). */
const FAQ_ANSWERS: { match: RegExp; answer: string }[] = [
  {
    match: /help my town|where do i begin|where (do|should) i start/,
    answer:
      "Start by joining an event. You'll learn more in one morning than hours of scrolling about civic issues. I promise.",
  },
  {
    match: /don'?t know anyone|will i fit in|fit in/,
    answer:
      'Absolutely. Most of our volunteers walked in alone the first time. They usually leave with muddy shoes, new friends, and plans for the next event.',
  },
  {
    match: /what should i bring|bring to an event/,
    answer:
      "Just a water bottle, wear comfortable shoes, and bring your radiant energy. We'll take care of the rest.",
  },
  {
    match: /fastest way to report|report a civic issue|how (do|to) (i )?report/,
    answer:
      'Take a clear photo, note the location, and report it. Complaining in a group chat rarely fixes potholes. A proper report actually has a chance.',
  },
  {
    match: /keeps littering|someone.*(litter|dump)|littering/,
    answer:
      "Lead with kindness, not a lecture. Most people don't enjoy being called out, but many respond to a friendly conversation or a simple example. Change spreads faster than arguments.",
  },
  {
    match: /waste segregation|segregation sounds|segregat/,
    answer:
      "Don't overthink it. Start with just two bins—wet and dry. Once that becomes a habit, everything else feels surprisingly easy.",
  },
  {
    match: /which tree|tree should i plant|what tree/,
    answer:
      "Plant for the next generation, not the next summer. The best trees take time—and that's exactly what makes them worth it.",
  },
  {
    match: /easiest sustainable|sustainable habit|habit to start/,
    answer:
      "Carry a reusable bottle. It's one tiny habit that quietly saves hundreds of plastic bottles over time—and your wallet won't complain either.",
  },
  {
    match: /neighborhood better|make our (neighbourhood|neighborhood)|neighbourhood better/,
    answer:
      "Don't try to fix everything this weekend. Pick one problem, solve it well, then move on to the next. Towns improve one small win at a time.",
  },
  {
    match: /not very active|want to contribute|i'?m not very active/,
    answer:
      "That's okay. Sometimes clicking one good photo of a civic issue or sharing one meaningful post helps more than you realize.",
  },

  // —— App how-tos ——
  {
    match: /how (do|to) (i )?(use|open)?\s*(the )?app|what (can|does) (this|the) app|town therapy (do|for)/,
    answer:
      'Town Therapy is simple: report issues, join drives, and grow as a volunteer. Start on Home — tap Report, Events, or Join — and pick one small action today.',
  },
  {
    match: /how (do|to) (i )?rsvp|join (an |a )?event|sign up for (an |a )?(event|drive)|upcoming event/,
    answer:
      'Open the Events tab → Upcoming for what’s on. Tap a drive, then RSVP (it flips to Going ✓). After the drive ends, tap Complete so it counts toward your hours.',
  },
  {
    match: /complete (a |the )?drive|mark (as )?complete|check.?in|confirm (i |you )?went|volunteer hours|how (do|to).*(hours|level)/,
    answer:
      "RSVP alone doesn't add hours. After the drive's start time, open Events → My RSVPs (or You → Confirm your drives) and tap Complete. Each completed drive is about 3 hours and grows your level.",
  },
  {
    match: /volunteer level|what level|growth tree|supporter|contributor|guardian|champion|elite|legend/,
    answer:
      'Levels come from completed drives: Supporter → Contributor → Guardian → Champion → Elite → Legend. Check You for your growth tree and how close you are to the next stage.',
  },
  {
    match: /become a volunteer|how (do|to) (i )?register|sign up|create (a )?profile|email updates/,
    answer:
      'On Home tap Join (or You → Become a volunteer). Add your name and email on Stay in the loop, choose Event updates / Town newsletter, and Sign up for emails. You start as a Supporter.',
  },
  {
    match: /take a break|pause volunteering|resume/,
    answer:
      'On You, tap Take a Break if you need space — you can still keep event or email updates on. When you’re ready, tap Resume volunteering. Your seed and progress stay put.',
  },
  {
    match: /chalkboard|sticky note|town board|leave a note/,
    answer:
      'On Home open Town board → Town chalkboard. Write a tip or suggestion (keep it short), pick a color, tap Write it. Notes sync for everyone and fade after 7 days unless an admin pins them.',
  },
  {
    match: /green tip/,
    answer:
      'Those Green tips on Home are tiny sustainability nudges. Tap the tile to flip to the next one whenever you want a fresh idea.',
  },
  {
    match: /sos|emergency|public safety|alert volunteers|helpline|112/,
    answer:
      'Open Reports → Report an issue and scroll to Public Safety. Call 112 for life-threatening emergencies. You can also Alert volunteers & admins with your live location — and tap I\'m safe now when you’re okay.',
  },
  {
    match: /id card|volunteer (id|card)|about you|achievements|badges/,
    answer:
      'Open You. Registered volunteers get an ID card (drives, hours, issues), About you fields, achievements, and your growth journey. Keep your skill and availability filled so the town can find you.',
  },
  {
    match: /cancel rsvp|not going|leave (an |the )?event/,
    answer:
      'Open the event (or Events → My RSVPs) and tap Going ✓ again to cancel. Easy in, easy out — just come when you can.',
  },
  {
    match: /pothole|streetlight|waste management|traffic|governance/,
    answer:
      'Reports → Report an issue, pick the matching type (Potholes, Streetlights, Waste Management, Traffic, or Governance), add a clear photo and location, then Submit. One issue per report works best.',
  },
  {
    match: /monsoon|drain|flood|flooding/,
    answer:
      'Before the rains: walk your lane, clear plastic from drain mouths, and stop dumping near drains. Report blocked sections in Reports with a photo and location — neighbors clearing one stretch together beats a week of complaining.',
  },
  {
    match: /plastic|polythene|single.?use|leaf plate/,
    answer:
      'Carry a cloth bag and a bottle. At stalls, ask for a leaf plate or bowl instead of plastic when you can. Tiny swaps add up faster than perfect plans.',
  },
  {
    match: /compost|food waste|kitchen scrap/,
    answer:
      'Finish what’s on your plate first. Kitchen scraps can go in your wet bin — or a small compost setup if you’ve got one. Wet waste in landfills isn’t harmless; it just disappears from sight.',
  },
  {
    match: /water conserv|save water|rainwater|leaking tap/,
    answer:
      'Fix the dripping tap, then collect a bit of rainwater for plants if you can. Boring? Yes. Effective? Extremely.',
  },
];

function faqAnswer(question: string) {
  const q = question.toLowerCase().trim();
  return FAQ_ANSWERS.find((item) => item.match.test(q))?.answer ?? null;
}

/** Short “you decide / tell me / I don’t know” follow-ups that need prior context. */
function isDeferralFollowUp(question: string) {
  const q = question.toLowerCase().trim().replace(/\s+/g, ' ');
  if (q.length > 80) return false;
  return (
    /^(yes|yeah|yep|ok|okay|sure|please|do it|go ahead)[.!]?$/i.test(q) ||
    /^(yes[,.]?\s*)?(tell|suggest|give|pick|choose|recommend)\s+(me|one|something|anything)/i.test(
      q
    ) ||
    /\bi don'?t know\b/i.test(q) ||
    /\byou tell me\b/i.test(q) ||
    /\bidk\b/i.test(q) ||
    /\bwhat (should|can) i (do|pick|try)\b/i.test(q) ||
    /\bsuggest (one|something|anything)\b/i.test(q) ||
    /\bany ideas?\b/i.test(q)
  );
}

function lastSubstantialUserMessage(messages: CivicChatMessage[]) {
  const users = messages.filter((message) => message.role === 'user');
  for (let i = users.length - 1; i >= 0; i -= 1) {
    const text = users[i].content.trim();
    if (!isDeferralFollowUp(text) && text.length >= 12) return text;
  }
  return users[users.length - 1]?.content.trim() ?? '';
}

/** Concrete next step when they ask us to pick for them. */
function concreteSuggestion(topic: string, events: Event[]) {
  const q = topic.toLowerCase();
  const next = events[0];
  const eventNudge = next
    ? (() => {
        const { date, month, time } = formatEventDateParts(next.starts_at);
        return `Or RSVP to "${next.title}" (${month} ${date}, ${time} at ${next.location_label}) under Events → Upcoming.`;
      })()
    : 'Or open Events → Upcoming and RSVP to whatever’s next.';

  if (/neighborhood|neighbourhood|community|street|locality|mohalla/.test(q)) {
    return `Alright — here’s one clear move this week: walk your own street once, pick the worst spot (trash pile, pothole, dead light), and file it in Reports → Report an issue with a clear photo + location. One solid report beats a vague “someone should fix this.” ${eventNudge} Which one will you try first?`;
  }
  if (/waste|segregat|garbage|litter|bin/.test(q)) {
    return `Let’s keep it tiny: set up two bins at home today — wet and dry — and stick to that for a week. No perfection, just the habit. If you spot dumping on the street, photo + Reports. ${eventNudge}`;
  }
  if (/littering|someone keeps|dump/.test(q)) {
    return `Start gentle: one calm chat with the person (or leave a clear chalkboard note on Home → Town board). If it continues, document with a photo and report it — no group-chat pile-on needed. Want the report path or the chalkboard path?`;
  }
  if (/tree|plant|sapling/.test(q)) {
    return `Pick a native shade tree if you can, plant it where it’ll get water for the first two summers, and protect the base. If you’d rather join a group plant, ${eventNudge}`;
  }
  if (/sustain|habit|eco|green|climate|bottle/.test(q)) {
    return `Easiest win: carry one reusable bottle starting tomorrow and skip the disposable for a week. Count how many plastics you dodge — it’s oddly motivating. Want a second habit after that?`;
  }
  if (/report|issue|pothole|civic/.test(q)) {
    return `Do this once today: Reports → Report an issue → pick the type → clear photo → pin the location → Submit. One complete report is worth more than ten forwards. Got a spot in mind?`;
  }
  if (/event|volunteer|drive|cleanup|rsvp|begin|start|help my town|contribute|active/.test(q)) {
    if (!next) {
      return `Then start here: open Events → Upcoming, RSVP to one drive that fits your week, show up, and tap Complete after. One morning beats a month of intending to help.`;
    }
    const { date, month, time } = formatEventDateParts(next.starts_at);
    return `Then start here: open Events → Upcoming, RSVP to "${next.title}" (${month} ${date}, ${time}), show up, then tap Complete after. That one drive teaches more than scrolling. Sound doable?`;
  }
  if (/fit in|don'?t know anyone/.test(q)) {
    return `Come to the next drive anyway — most people arrive solo. Say hi to whoever’s holding the clipboard, do one shared task, and you’ll leave with faces you recognize. ${eventNudge}`;
  }

  return `Here’s a default starter pack: (1) report one real issue with a photo this week, or (2) RSVP to one upcoming drive. ${eventNudge} Pick either — both move the town.`;
}

function formatUpcomingEventLine(event: Event, index: number) {
  const { date, month, time } = formatEventDateParts(event.starts_at);
  const blurb = event.description?.trim()
    ? ` — ${event.description.trim().slice(0, 110)}${event.description.trim().length > 110 ? '…' : ''}`
    : '';
  return `${index + 1}. "${event.title}" · ${month} ${date}, ${time} · ${event.location_label} · ${event.category} · ${event.attendee_count} RSVPed${blurb}`;
}

async function loadUpcomingEvents(): Promise<Event[]> {
  try {
    const events = await api.listEvents(null, false, 10);
    const now = Date.now();
    return events
      .filter((event) => new Date(event.starts_at).getTime() >= now)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
      .slice(0, 6);
  } catch {
    return [];
  }
}

function buildUpcomingEventsBrief(events: Event[]) {
  if (events.length === 0) {
    return [
      'UPCOMING EVENTS (live from Town Therapy — reference only):',
      'None scheduled right now.',
      'Only mention the calendar if they ask what’s on. Do not append RSVP reminders to unrelated answers.',
    ].join('\n');
  }

  return [
    'UPCOMING EVENTS (live from Town Therapy — reference only; only recommend these; do not invent others):',
    ...events.map((event, index) => formatUpcomingEventLine(event, index)),
    'How to join: Events tab → Upcoming → open the drive → RSVP.',
    'Mention a specific event ONLY when they ask about events/schedule. Do not tack an RSVP reminder onto every reply — that send-off is handled at wrap-up.',
  ].join('\n');
}

function wrapUpMessage(events: Event[]) {
  const next = events[0];
  if (!next) return CIVIC_CHAT_WRAP_UP_MESSAGE;
  const { date, month, time } = formatEventDateParts(next.starts_at);
  return `Nice talking to you — make sure to RSVP to "${next.title}" (${month} ${date}, ${time} at ${next.location_label}), and see you there!`;
}

function buildModelMessages(messages: CivicChatMessage[], upcomingBrief: string) {
  const latest = [...messages].reverse().find((message) => message.role === 'user');
  const topicForTips = latest
    ? isDeferralFollowUp(latest.content)
      ? lastSubstantialUserMessage(messages)
      : latest.content
    : '';
  const talkingPoints = topicForTips ? faqAnswer(topicForTips) : null;

  const systemParts = [CIVIC_ASSISTANT_SYSTEM_PROMPT, upcomingBrief];
  if (talkingPoints) {
    systemParts.push(
      `TALKING POINTS for this turn (paraphrase naturally in your own voice — do NOT paste verbatim as a brochure; expand into a real chat reply and invite a follow-up when it helps. Do NOT append an upcoming-event / RSVP reminder unless they asked about events or the schedule):\n${talkingPoints}`
    );
  }
  if (latest && isDeferralFollowUp(latest.content)) {
    systemParts.push(
      `The user just deferred to you ("${latest.content.trim()}"). Give ONE concrete next step tied to the earlier topic — do not restart with a generic “ask me anything” intro.`
    );
  }

  return [
    { role: 'system' as const, content: systemParts.join('\n\n') },
    ...messages.slice(-16).map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];
}

function composeLocalAnswer(messages: CivicChatMessage[], events: Event[]) {
  const latest = [...messages].reverse().find((message) => message.role === 'user');
  const question = latest?.content.trim() ?? '';
  const q = question.toLowerCase().trim();
  const next = events[0];
  const nextLine = next
    ? (() => {
        const { date, month, time } = formatEventDateParts(next.starts_at);
        return `Next up: "${next.title}" — ${month} ${date}, ${time} at ${next.location_label}. Open Events → Upcoming and tap RSVP.`;
      })()
    : 'Open Events → Upcoming to see what’s scheduled — new drives show up there first.';

  // Follow-ups like “you tell me” / “yes” need the earlier topic, not a fresh intro.
  if (isDeferralFollowUp(question)) {
    const topic = lastSubstantialUserMessage(messages);
    return concreteSuggestion(topic || question, events);
  }

  if (/(hi|hello|hey|namaste)\b/.test(q) && q.length < 40) {
    return "Hey — glad you're here. Ask me about the app, events, reporting, or anything civic in Hazaribagh. What's on your mind?";
  }
  if (/(thank|thanks|shukriya)/.test(q) && q.length < 50) {
    return "Anytime. You've got this — want to pick a next step together?";
  }
  if (/(who are you|what can you)/.test(q)) {
    return "I'm Dr. Rant — your civic coach inside Town Therapy. I know the app and what's coming up on Events. What are we tackling?";
  }

  if (
    /(upcoming|what('?s| is) on|next (event|drive|cleanup)|any (event|drive)|when is|schedule|calendar)/.test(
      q
    )
  ) {
    if (events.length === 0) {
      return "Nothing's on the calendar right this second — check Events → Upcoming in a bit, or report an issue / leave a chalkboard note while you wait.";
    }
    const list = events
      .slice(0, 3)
      .map((event) => {
        const { date, month, time } = formatEventDateParts(event.starts_at);
        return `• ${event.title} — ${month} ${date}, ${time} · ${event.location_label}`;
      })
      .join('\n');
    return `Here's what's coming up:\n${list}\n\nOpen Events → Upcoming and tap RSVP on the one that fits you. Want help picking?`;
  }

  const faq = faqAnswer(question);
  if (faq) {
    return `${faq} What feels doable for you this week?`;
  }

  if (/(event|rsvp|drive|volunteer|cleanup)/.test(q)) {
    return next
      ? `${nextLine} After you go, tap Complete so your hours count.`
      : 'Open Events → Upcoming, RSVP to a drive, show up, then tap Complete afterward so your hours and level grow.';
  }
  if (/(report|issue|pothole|complaint)/.test(q)) {
    return "Reports → Report an issue: choose the type, add a clear photo and location, then Submit. One solid report beats ten angry forwards. Got a spot in mind?";
  }
  if (/(sustain|eco|environment|green|climate)/.test(q)) {
    return "Start tiny — reusable bottle, wet/dry bins, or one short walk instead of a bike hop. Want a habit that fits your actual week?";
  }
  if (/(app|tab|profile|home|how do i|where (is|do))/i.test(q)) {
    return "Try Home for quick actions, Events for drives, Reports for issues, and You for your profile and levels. Tell me what you're trying to do and I'll point to the exact tap.";
  }

  // Soft fallback: if earlier turns had a topic, give a concrete nudge instead of the intro loop.
  const prior = lastSubstantialUserMessage(messages);
  if (prior && prior.toLowerCase() !== q) {
    return concreteSuggestion(prior, events);
  }

  return "I'm with you — ask me anything about Town Therapy, events, reporting, civic duties, or sustainable living, and we'll figure out one clear next step.";
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Type out local replies so the chat still feels live offline. */
async function streamLocalText(
  text: string,
  onToken: (token: string) => void,
  signal?: AbortSignal
) {
  const chunks = text.match(/\s+|\S+/g) ?? [text];
  for (const chunk of chunks) {
    if (signal?.aborted) throw new Error('Cancelled');
    onToken(chunk);
    await sleep(chunk.length > 8 ? 28 : 16);
  }
}

function parseSseChunk(buffer: string) {
  const parts = buffer.split('\n');
  const rest = parts.pop() ?? '';
  let token = '';

  for (const line of parts) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;
    const data = trimmed.slice(5).trim();
    if (!data || data === '[DONE]') continue;
    try {
      const json = JSON.parse(data) as {
        choices?: { delta?: { content?: string } }[];
      };
      token += json.choices?.[0]?.delta?.content ?? '';
    } catch {
      // ignore partial JSON
    }
  }

  return { token, rest };
}

async function streamOpenAI(
  messages: CivicChatMessage[],
  onToken: (token: string) => void,
  upcomingBrief: string,
  signal?: AbortSignal
) {
  const apiKey = config.openaiApiKey;
  if (!apiKey) return null;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    signal,
    body: JSON.stringify({
      model: config.openaiModel,
      temperature: 0.8,
      max_tokens: 550,
      stream: true,
      messages: buildModelMessages(messages, upcomingBrief),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || 'Could not reach the assistant right now.');
  }

  // Prefer true streaming when the runtime supports it.
  const body = response.body;
  if (body && typeof (body as { getReader?: () => unknown }).getReader === 'function') {
    const reader = (body as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parsed = parseSseChunk(buffer);
      buffer = parsed.rest;
      if (parsed.token) {
        full += parsed.token;
        onToken(parsed.token);
      }
    }

    if (buffer.trim()) {
      const parsed = parseSseChunk(`${buffer}\n`);
      if (parsed.token) {
        full += parsed.token;
        onToken(parsed.token);
      }
    }

    return full.trim();
  }

  // Fallback: some RN builds buffer the full SSE body — still parse tokens out.
  const raw = await response.text();
  let full = '';
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;
    const data = trimmed.slice(5).trim();
    if (!data || data === '[DONE]') continue;
    try {
      const json = JSON.parse(data) as {
        choices?: { delta?: { content?: string }; message?: { content?: string } }[];
      };
      const piece =
        json.choices?.[0]?.delta?.content ?? json.choices?.[0]?.message?.content ?? '';
      if (piece) {
        full += piece;
        onToken(piece);
        await sleep(8);
      }
    } catch {
      // ignore
    }
  }

  return full.trim() || null;
}

export type CivicStreamHandlers = {
  onToken: (token: string) => void;
  signal?: AbortSignal;
};

/** Live chat: streams tokens when OpenAI is configured; types local replies offline. */
export async function streamCivicAssistant(
  messages: CivicChatMessage[],
  handlers: CivicStreamHandlers
) {
  const latest = [...messages].reverse().find((message) => message.role === 'user');
  if (!latest?.content.trim()) {
    throw new Error('Send a message first.');
  }

  const upcoming = await loadUpcomingEvents();
  const upcomingBrief = buildUpcomingEventsBrief(upcoming);

  const userTurns = messages.filter((message) => message.role === 'user').length;
  if (userTurns >= CIVIC_CHAT_WRAP_UP_AFTER) {
    const goodbye = wrapUpMessage(upcoming);
    await streamLocalText(goodbye, handlers.onToken, handlers.signal);
    return { text: goodbye, source: 'local' as const };
  }

  try {
    const remote = await streamOpenAI(
      messages.slice(-16),
      handlers.onToken,
      upcomingBrief,
      handlers.signal
    );
    if (remote) {
      return { text: remote, source: 'openai' as const };
    }
  } catch (error) {
    if (handlers.signal?.aborted) throw error;
    // Fall through to local live typing.
  }

  const local = composeLocalAnswer(messages, upcoming);
  await streamLocalText(local, handlers.onToken, handlers.signal);
  return { text: local, source: 'local' as const };
}

/** Non-streaming helper (tests / callers that want the full string). */
export async function askCivicAssistant(messages: CivicChatMessage[]) {
  let text = '';
  const result = await streamCivicAssistant(messages, {
    onToken: (token) => {
      text += token;
    },
  });
  return { text: text.trim() || result.text, source: result.source };
}

export const CIVIC_STARTER_PROMPTS = [
  'I want to help my town. Where do I begin?',
  "I don't know anyone. Will I fit in?",
  'What should I bring to an event?',
  "What's the fastest way to report a civic issue?",
  'Someone keeps littering. What should I do?',
  'Waste segregation sounds confusing.',
  'Which tree should I plant?',
  "What's the easiest sustainable habit to start today?",
  'How do we make our neighborhood better?',
  "I want to contribute but I'm not very active.",
];
