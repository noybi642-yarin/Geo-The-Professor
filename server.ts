import type { TimelineEvent } from "@/types";

export const TIMELINE_EVENTS: Omit<TimelineEvent, "id">[] = [
  {
    year: 1917,
    title: "Balfour Declaration",
    type: "political",
    era: "founding",
    description:
      "British Foreign Secretary Arthur Balfour writes to Lord Rothschild expressing support for a 'national home for the Jewish people' in Palestine — while simultaneously promising Arabs independence for fighting the Ottomans.",
    actors: ["UK", "Zionist Federation", "Palestinian Arabs"],
    consequences:
      "Planted the seed of dual competing national claims to the same land. Britain's contradictory wartime promises created a conflict that outlasted the British Empire itself.",
    related_events: ["1947 UN Partition Plan", "1948 Arab-Israeli War"],
  },
  {
    year: 1947,
    title: "UN Partition Plan (Resolution 181)",
    type: "political",
    era: "founding",
    description:
      "The UN votes to divide Mandatory Palestine into separate Jewish and Arab states, with Jerusalem under international administration. Jewish leadership accepts; Arab states and Palestinian Arabs reject it.",
    actors: ["UN", "Jewish Agency", "Arab League", "Palestinian Arabs"],
    consequences:
      "The Jewish acceptance and Arab rejection defined the political narrative for decades — whether fairly or not. The plan's borders never came into effect; the 1948 war created entirely different facts on the ground.",
    related_events: ["1948 Arab-Israeli War", "al-Nakba"],
  },
  {
    year: 1948,
    title: "Israel Founded / al-Nakba",
    type: "war",
    era: "founding",
    description:
      "Israel declares independence on May 14. Five Arab armies invade the next day. In the war that follows, Israel expands beyond partition lines; approximately 700,000 Palestinians flee or are expelled. Palestinians call this al-Nakba — the Catastrophe.",
    actors: ["Israel", "Egypt", "Jordan", "Syria", "Iraq", "Palestinian Arabs"],
    consequences:
      "Created the Palestinian refugee crisis — now numbering over 5 million registered refugees — that remains the most intractable issue in any peace negotiation. Jordan annexes the West Bank; Egypt administers Gaza.",
    related_events: [
      "1947 Partition Plan",
      "Palestinian Refugee Crisis",
      "1967 Six-Day War",
    ],
  },
  {
    year: 1956,
    title: "Suez Crisis",
    type: "war",
    era: "founding",
    description:
      "Egypt's Nasser nationalizes the Suez Canal. Britain, France, and Israel invade. The US and USSR both pressure withdrawal — signaling the end of European imperial power and America's emergence as the dominant outside force.",
    actors: ["Egypt", "Israel", "UK", "France", "US", "USSR"],
    consequences:
      "Nasser becomes the hero of Arab nationalism. British and French credibility collapse. The US steps into the regional power vacuum. Established the pattern of superpower competition playing out through regional proxies.",
    related_events: ["Arab Nationalism", "Cold War in Middle East"],
  },
  {
    year: 1964,
    title: "PLO Founded",
    type: "political",
    era: "founding",
    description:
      "The Palestine Liberation Organization is established by the Arab League in Cairo, initially as a tool of Arab states. Yasser Arafat's Fatah gradually takes control after 1967.",
    actors: ["Arab League", "Yasser Arafat", "Fatah"],
    consequences:
      "Created the institutional framework for Palestinian national politics — which both empowered Palestinians and created bureaucratic ossification. The PLO's recognition of Israel in 1993 was one of the most consequential acts in the conflict's history.",
    related_events: ["1967 Six-Day War", "Oslo Accords"],
  },
  {
    year: 1967,
    title: "Six-Day War",
    type: "war",
    era: "wars",
    description:
      "Israel launches a preemptive strike on June 5, destroying Arab air forces on the ground. In six days, Israel captures the Sinai Peninsula and Gaza from Egypt, the West Bank from Jordan, and the Golan Heights from Syria.",
    actors: ["Israel", "Egypt", "Jordan", "Syria"],
    consequences:
      "The single most consequential event since 1948. Israel's occupation of the West Bank and Gaza creates the framework within which every negotiation has occurred since. UN Resolution 242 demands withdrawal from 'occupied territories' — but the lack of a definite article in English made it immediately contested.",
    related_events: [
      "Occupation",
      "Settlement Movement",
      "1973 Yom Kippur War",
      "Oslo Accords",
    ],
  },
  {
    year: 1973,
    title: "Yom Kippur / Ramadan War",
    type: "war",
    era: "wars",
    description:
      "Egypt and Syria launch a coordinated surprise attack on Yom Kippur (October 6). Initial Arab advances are reversed after massive US arms airlift to Israel. OPEC imposes oil embargo on Western nations supporting Israel.",
    actors: ["Egypt", "Syria", "Israel", "US", "OPEC", "USSR"],
    consequences:
      "Changed everything economically (oil crisis) and diplomatically. Egypt's partial success gave Sadat the credibility to pursue peace. The war demonstrated both Arab military capability and US commitment to Israel's survival — setting up the Camp David breakthrough.",
    related_events: ["Camp David Accords", "Egypt-Israel Peace Treaty", "Oil Crisis"],
  },
  {
    year: 1979,
    title: "Iranian Revolution + Egypt-Israel Peace",
    type: "political",
    era: "wars",
    description:
      "A revolutionary year: the Shah is overthrown; Ayatollah Khomeini establishes the Islamic Republic. Three months later, Egypt and Israel sign the Camp David Peace Treaty — Egypt becomes first Arab state to recognize Israel.",
    actors: ["Iran", "Khomeini", "Sadat", "Begin", "Carter", "Egypt", "Israel"],
    consequences:
      "Twin shocks to the regional order. Iran becomes an ideological opponent of both Israel and the US. Egypt is expelled from the Arab League until 1989. The 'peace for land' framework of Camp David became the template — but no other Arab state followed for a decade.",
    related_events: ["Axis of Resistance", "Hezbollah Founding", "Iran Nuclear Program"],
  },
  {
    year: 1982,
    title: "Lebanon War & Sabra-Shatila Massacre",
    type: "war",
    era: "wars",
    description:
      "Israel invades Lebanon to expel the PLO. During the occupation, Lebanese Christian militias massacre Palestinian civilians in Sabra and Shatila refugee camps while Israeli forces control the perimeter.",
    actors: ["Israel", "PLO", "Lebanon", "Lebanese Christian militias", "Syria"],
    consequences:
      "PLO expelled to Tunisia, fracturing Palestinian political geography. Massacre triggered massive international condemnation; Israeli commission found Ariel Sharon indirectly responsible. Hezbollah founded with Iranian backing to resist Israeli occupation.",
    related_events: ["Hezbollah", "PLO", "Iranian Influence in Lebanon"],
  },
  {
    year: 1987,
    title: "First Intifada",
    type: "conflict",
    era: "wars",
    description:
      "A spontaneous Palestinian uprising erupts in Gaza and spreads to the West Bank. Characterized by stone-throwing youth against armed soldiers. Hamas is founded during this period.",
    actors: ["Palestinian civilians", "Israel", "PLO", "Hamas"],
    consequences:
      "Forced the world to confront the occupation in human terms. Strengthened Palestinian civil society. Hamas emerges as a political force. The Intifada created the political pressure that eventually led to Oslo.",
    related_events: ["Hamas Founded", "Oslo Accords", "PLO"],
  },
  {
    year: 1993,
    title: "Oslo Accords",
    type: "diplo",
    era: "oslo",
    description:
      "Secret negotiations in Norway produce the Declaration of Principles: PLO recognizes Israel's right to exist; Israel recognizes the PLO as the representative of the Palestinian people. Palestinian Authority created to govern parts of the West Bank and Gaza.",
    actors: ["Yasser Arafat", "Yitzhak Rabin", "Bill Clinton", "PLO", "Israel"],
    consequences:
      "Created the PA but deliberately deferred all 'final status' issues — Jerusalem, borders, settlements, refugees — to future negotiations. Settlement construction continued throughout. Rabin was assassinated by a Jewish extremist in 1995. Most analysts consider Oslo's framework to have collapsed by 2000.",
    related_events: [
      "Palestinian Authority",
      "Settlement Expansion",
      "Camp David 2000",
      "Second Intifada",
    ],
  },
  {
    year: 2000,
    title: "Camp David Summit Fails / Second Intifada",
    type: "conflict",
    era: "oslo",
    description:
      "Clinton's final-status negotiations between Barak and Arafat collapse at Camp David. In September, Ariel Sharon visits the Temple Mount/al-Haram al-Sharif with heavy military escort. The Second Intifada erupts — far more violent than the first, with suicide bombings and military operations.",
    actors: ["Ehud Barak", "Yasser Arafat", "Bill Clinton", "Ariel Sharon"],
    consequences:
      "Effectively ended Oslo's political credibility on both sides. Over 3,000 Palestinian and 1,000 Israeli deaths. Hamas gains at Fatah's expense. Israel builds the separation barrier. The narrative 'Barak made a generous offer; Arafat rejected it' became politically dominant in the West — contested by most academic historians.",
    related_events: ["Hamas", "Gaza Disengagement 2005", "Settlement Expansion"],
  },
  {
    year: 2006,
    title: "Hamas Election Victory / Second Lebanon War",
    type: "conflict",
    era: "modern",
    description:
      "Hamas wins Palestinian legislative elections in January — the US and EU refuse to recognize the results. In summer, Hezbollah captures two Israeli soldiers; Israel launches a 34-day war on Lebanon. Hezbollah survives and claims 'divine victory.'",
    actors: ["Hamas", "Hezbollah", "Israel", "US", "EU", "Iran"],
    consequences:
      "Hamas's election victory creates a dilemma: a democratic outcome the West refuses to accept. Hezbollah's resilience strengthens the 'Axis of Resistance' narrative. Iran's influence in both Lebanon and Gaza solidifies.",
    related_events: ["Gaza Blockade", "Axis of Resistance", "Iran Proxy Network"],
  },
  {
    year: 2007,
    title: "Hamas Takes Gaza",
    type: "political",
    era: "modern",
    description:
      "After months of conflict between Hamas and Fatah, Hamas seizes full control of Gaza in a brief but bloody civil war. The Palestinian political split becomes geographic: Fatah governs the West Bank; Hamas governs Gaza.",
    actors: ["Hamas", "Fatah", "Israel", "Egypt", "US"],
    consequences:
      "Israel and Egypt impose a blockade on Gaza. The Palestinian national project is now institutionally divided — undermining any negotiated solution. Hamas governs 2 million people under blockade while pursuing armed resistance. Fatah governs the West Bank in a security partnership with Israel.",
    related_events: ["Gaza Blockade", "Oslo Accords", "Palestinian Authority"],
  },
  {
    year: 2011,
    title: "Arab Spring",
    type: "political",
    era: "modern",
    description:
      "Mass uprisings sweep the Arab world — Tunisia, Egypt, Libya, Syria, Bahrain, Yemen. Democratically elected governments briefly emerge; most are subsequently reversed or descend into civil war.",
    actors: ["Egypt", "Tunisia", "Syria", "Libya", "Yemen", "Bahrain", "Iran", "Saudi Arabia"],
    consequences:
      "Syria's civil war draws in Russia, Iran, Turkey, and Gulf states, creating a multi-actor proxy conflict. Egypt returns to military rule under Sisi. The Arab Spring's failure strengthened authoritarian governments' argument that the alternative to stability is chaos.",
    related_events: ["Syrian Civil War", "ISIS Rise", "Iran-Saudi Rivalry"],
  },
  {
    year: 2015,
    title: "Iran Nuclear Deal (JCPOA)",
    type: "diplo",
    era: "modern",
    description:
      "Iran agrees to limit its nuclear program in exchange for sanctions relief. The US, EU, UK, France, Germany, Russia, and China are signatories. Israel and Saudi Arabia strongly oppose the deal.",
    actors: ["Iran", "US", "EU", "Russia", "China", "Israel", "Saudi Arabia"],
    consequences:
      "The deal contained but did not eliminate Iran's nuclear capability. Trump withdrew in 2018; Biden tried to restore it but negotiations stalled. Iran's nuclear program has since advanced significantly beyond JCPOA limits.",
    related_events: ["Iran Nuclear Program", "US-Iran Relations", "Saudi-Iran Rivalry"],
  },
  {
    year: 2020,
    title: "Abraham Accords",
    type: "diplo",
    era: "modern",
    description:
      "UAE, Bahrain, Sudan, and Morocco normalize relations with Israel under US brokerage. The Palestinian question is bypassed entirely — the deals prioritize anti-Iran alignment and economic cooperation.",
    actors: ["Trump", "Netanyahu", "UAE", "Bahrain", "Sudan", "Morocco"],
    consequences:
      "Represented the most significant Arab-Israeli normalization since Egypt (1979) and Jordan (1994). Exposed the fracture between Arab governments and Arab publics on Palestine. Saudi normalization appeared imminent before October 7 derailed it.",
    related_events: [
      "Saudi Normalization",
      "Iran",
      "October 7 Attack",
      "Palestinian Authority",
    ],
  },
  {
    year: 2023,
    title: "October 7 Attack & Gaza War",
    type: "war",
    era: "modern",
    description:
      "Hamas launches the largest attack on Israel since 1948 on October 7: ~1,200 killed, ~250 taken hostage. Israel launches a ground invasion of Gaza. By mid-2024, over 35,000 Palestinians killed; Gaza's infrastructure largely destroyed. Hezbollah engages from Lebanon; Houthis attack Red Sea shipping.",
    actors: [
      "Hamas",
      "Israel",
      "Gaza civilians",
      "Hezbollah",
      "Houthis",
      "Iran",
      "US",
      "Qatar",
      "Egypt",
    ],
    consequences:
      "Ongoing and unresolved. Saudi normalization frozen. Palestinian Authority further delegitimized. International law frameworks tested. No political horizon visible. The question of Gaza's post-war governance remains entirely unanswered.",
    related_events: [
      "Gaza War 2023",
      "Ceasefire Negotiations",
      "Abraham Accords",
      "Axis of Resistance",
    ],
  },
];
