/* Wormholes Beta 301 Theme Deck system.
   Built-in and custom Theme Decks remain local, selected themes are shared by
   Generate and Create, and random selection never reads from an unselected deck. */

const BUILTIN_THEME_DECKS = Object.freeze([
  {
    id: "builtin-everyday-life",
    title: "Everyday Life",
    description:
      "Grounded places, routines, relationships, and small choices that can carry large emotional stakes.",
    builtin: true,
    cards: {
      what: [
        "A neighbor",
        "A teacher",
        "A cashier",
        "A nurse",
        "A mechanic",
        "A student",
        "A landlord",
        "A laundromat",
        "A café",
        "An apartment",
        "A school",
        "A grocery store",
        "A bus stop",
        "A public park",
        "A bicycle",
        "A lunchbox",
        "A house key",
        "A grocery list",
        "A uniform",
        "A family recipe",
      ],
      attribute: [
        "Held together by familiar routines",
        "Quietly competitive beneath a polite surface",
        "Warmer than it first appears",
        "Dependent on one unreliable person",
        "Full of small unspoken rules",
        "Comforting to some and confining to others",
        "Recently changed in a way no one acknowledges",
        "Always busier than expected",
        "Marked by practical compromises",
        "Built around a long-standing habit",
        "Strained by money worries",
        "Kept orderly through collective effort",
        "Known for an unofficial tradition",
        "Shared by people with very different priorities",
        "Easy to overlook but hard to replace",
        "Running on goodwill and borrowed time",
        "Filled with private corners",
        "More fragile than its appearance suggests",
        "Sustained by small acts of care",
        "Under pressure to seem normal",
        "Unexpectedly generous",
        "Frequented by the same changing faces",
        "Organized around one person’s schedule",
        "Quiet during the wrong hours",
        "Carrying the weight of old disagreements",
        "Reliable until one detail goes wrong",
        "Decorated with mismatched contributions",
        "Bound by convenience rather than affection",
        "Slowly becoming something new",
        "Protected by collective denial",
        "Comfortably worn around the edges",
        "Known for solving problems informally",
        "Dependent on favors that are never recorded",
        "Full of things waiting to be repaired",
        "Friendly in public and tense in private",
        "Shaped by a recent arrival",
        "Maintained by someone who feels invisible",
        "Too important to close and too costly to continue",
        "Ordinary except for one persistent detail",
        "About to outgrow its current purpose",
      ],
      story: [
        "A small promise becomes unexpectedly difficult to keep.",
        "A routine favor reveals how unevenly responsibility is shared.",
        "Two people compete for the same ordinary opportunity.",
        "A minor mistake threatens someone’s carefully maintained reputation.",
        "An overlooked neighbor asks for help at the worst possible time.",
        "A familiar place may close unless the community acts together.",
        "Someone tries to hide a financial problem from the people closest to them.",
        "An unwanted guest becomes essential to solving a practical crisis.",
        "A harmless tradition forces an old disagreement back into the open.",
        "A lost object passes through several lives before returning home.",
        "A person agrees to cover one shift and inherits someone else’s problem.",
        "A quiet rivalry escalates through increasingly thoughtful gestures.",
        "A planned celebration exposes who has been left out.",
        "A newcomer misunderstands a local custom with lasting consequences.",
        "Someone must choose between being dependable and being honest.",
        "A household rearranges itself around a temporary emergency.",
        "An ordinary repair uncovers evidence of a forgotten chapter.",
        "A public complaint forces private loyalties into view.",
        "A person who always helps finally asks for something in return.",
        "A day that should be uneventful becomes a turning point through many small choices.",
      ],
    },
  },
  {
    id: "builtin-adventure-discovery",
    title: "Adventure & Discovery",
    description:
      "Journeys, unexplored places, difficult routes, and discoveries that change what characters believe is possible.",
    builtin: true,
    cards: {
      what: [
        "An explorer",
        "A cartographer",
        "A guide",
        "A pilot",
        "An archaeologist",
        "A courier",
        "A navigator",
        "An island",
        "A mountain pass",
        "A cave",
        "A jungle",
        "A desert",
        "A frontier outpost",
        "A canyon",
        "A compass",
        "A map",
        "An airship",
        "A field journal",
        "A relic",
        "A climbing rope",
      ],
      attribute: [
        "Beyond the limits of reliable maps",
        "Marked by shifting landmarks",
        "Reached only through a narrow window of time",
        "Beautiful enough to conceal obvious danger",
        "Already claimed by several rival groups",
        "Dependent on equipment that cannot be replaced",
        "Surrounded by contradictory rumors",
        "Difficult to leave once entered",
        "Known through fragments rather than facts",
        "Guarded by a natural obstacle",
        "Changing faster than it can be recorded",
        "Connected to a route thought permanently lost",
        "Rich in resources but poor in shelter",
        "Mapped accurately only by someone who disappeared",
        "Silent despite signs of recent activity",
        "Accessible only by trusting a stranger",
        "Filled with traces of an earlier expedition",
        "Divided by terrain that resists shortcuts",
        "Considered sacred by people who avoid it",
        "Valuable for reasons no one fully understands",
        "Visible from afar but difficult to approach",
        "Powered by a mechanism with missing instructions",
        "Subject to sudden changes in gravity, weather, or direction",
        "Safer at night than during the day",
        "Known to distort distance",
        "Promising answers to the wrong question",
        "Surrounded by evidence of repeated failed attempts",
        "Dependent on cooperation between incompatible specialists",
        "Full of routes that lead back to the beginning",
        "Offering a choice between speed and certainty",
        "Protected by an agreement no outsider understands",
        "Carrying signs of life where none should survive",
        "Older than the civilization studying it",
        "Reached by following something that cannot be measured",
        "Useful only if approached without force",
        "Changing each traveler in a different way",
        "Hiding its greatest danger in plain sight",
        "Linked to several legends that cannot all be true",
        "More crowded than the official records suggest",
        "About to become unreachable again",
      ],
      story: [
        "A map leads the expedition somewhere its maker could not have visited.",
        "The safest route closes after the group has already committed to the journey.",
        "A discovery proves valuable to one community and disastrous to another.",
        "The guide admits that this is the farthest they have ever traveled.",
        "A rival expedition requests help after sabotaging the protagonists earlier.",
        "The destination is real, but its purpose has been misunderstood.",
        "A member of the group recognizes a landmark from a recurring dream.",
        "Supplies are sufficient only if everyone agrees on what can be left behind.",
        "The expedition finds evidence that someone arrived recently and wants to remain hidden.",
        "A shortcut saves time but violates a promise made before departure.",
        "The group must decide whether to publish a discovery or protect it.",
        "A tool designed for the journey begins revealing information it was not meant to contain.",
        "The route home requires passing through a place changed by the expedition’s arrival.",
        "A seemingly minor passenger becomes the only person able to interpret the destination.",
        "The journey’s sponsor gives new orders once the discovery is confirmed.",
        "An environmental change separates the group into teams with different versions of events.",
        "The destination offers exactly what one traveler wants and what another fears.",
        "A recovered log suggests the original expedition chose not to return.",
        "The group reaches the destination only to learn they were being followed for protection.",
        "The final obstacle can be crossed only by giving up proof that the journey succeeded.",
      ],
    },
  },
  {
    id: "builtin-mystery-secrets",
    title: "Mystery & Secrets",
    description:
      "Hidden motives, uncertain evidence, investigations, concealed histories, and revelations that reframe earlier events.",
    builtin: true,
    cards: {
      what: [
        "A detective",
        "A witness",
        "A locksmith",
        "A journalist",
        "A suspect",
        "An informant",
        "A coroner",
        "A locked room",
        "An archive",
        "A hotel",
        "An alley",
        "A courthouse",
        "A theater",
        "A cemetery",
        "A diary",
        "A key",
        "A photograph",
        "A ledger",
        "A mask",
        "A cassette tape",
      ],
      attribute: [
        "Impossible to verify through ordinary records",
        "Encoded in objects no one considers important",
        "Known by several people who believe they are alone",
        "Protected by a convincing false explanation",
        "Visible only when two accounts are compared",
        "Connected to someone considered above suspicion",
        "Repeated with one detail changed each time",
        "Hidden by bureaucracy rather than cleverness",
        "Preserved through a chain of private favors",
        "Accompanied by evidence that is almost too perfect",
        "Dependent on a witness with something to lose",
        "Older than the investigation surrounding it",
        "Disguised as a familiar misunderstanding",
        "Revealed by an absence rather than a presence",
        "Linked to several motives but no clear culprit",
        "Protected by people who disagree about why",
        "Documented in a format no longer understood",
        "Obvious only after someone points it out",
        "Dangerous because of who believes it",
        "Hidden inside an official correction",
        "Known to a child, outsider, or overlooked worker",
        "Connected by timing rather than location",
        "Accompanied by a rumor designed to discredit the truth",
        "Recorded under several different names",
        "Dependent on a coincidence that may not be accidental",
        "Kept alive by repeated attempts to erase it",
        "Shared through coded acts of hospitality",
        "Buried beneath a more sensational mystery",
        "Protected by mutually assured embarrassment",
        "Impossible to explain without revealing another secret",
        "Known only through what people refuse to discuss",
        "Connected to a benefit no one admits receiving",
        "Misleading because every statement is technically true",
        "Accessible only by breaking a minor rule",
        "Remembered differently by everyone involved",
        "Hidden behind a respected institution",
        "Dependent on a false timeline",
        "Revealed through a pattern of ordinary purchases",
        "More personal than the investigator expects",
        "About to become public for the wrong reason",
      ],
      story: [
        "Every suspect remembers the same event differently, and all accounts contain proof.",
        "The investigator discovers that the original question was deliberately framed incorrectly.",
        "A confession solves one mystery while creating a more serious one.",
        "Someone keeps returning stolen items before anyone reports them missing.",
        "The strongest evidence implicates a person who could not have been present.",
        "A witness will speak only if the investigator agrees not to reveal the truth.",
        "The apparent victim has been guiding the investigation from hiding.",
        "A minor clerical error exposes a secret maintained for decades.",
        "Two unrelated mysteries share the same overlooked participant.",
        "The investigator’s most trusted source begins changing earlier statements.",
        "A solution depends on proving that an event everyone remembers never occurred.",
        "An anonymous warning accurately predicts each new discovery.",
        "The culprit is protecting someone who does not know they are involved.",
        "A missing record is found in a place where it could only have been planted recently.",
        "The investigation threatens a community agreement that has prevented greater harm.",
        "A suspect asks to be accused publicly for reasons unrelated to guilt.",
        "The final clue has been present in every conversation but interpreted as politeness.",
        "Solving the case would expose a truth the client paid to keep hidden.",
        "A second investigator reaches the opposite conclusion using the same evidence.",
        "The mystery ends when someone admits why they wanted it to remain unsolved.",
      ],
    },
  },
  {
    id: "builtin-love-belonging",
    title: "Love & Belonging",
    description:
      "Romance, friendship, family, community, loyalty, estrangement, and the need to be known and accepted.",
    builtin: true,
    cards: {
      what: [
        "A childhood friend",
        "A matchmaker",
        "A sibling",
        "A pen pal",
        "A caregiver",
        "A rival",
        "A newcomer",
        "A wedding hall",
        "A family home",
        "A community center",
        "A dance studio",
        "A train station",
        "A garden",
        "A restaurant",
        "A love letter",
        "A ring",
        "A photo album",
        "A shared playlist",
        "An heirloom",
        "An invitation",
      ],
      attribute: [
        "Tender but carefully guarded",
        "Sustained by small recurring rituals",
        "Stronger in private than in public",
        "Unevenly understood by the people involved",
        "Built after an earlier betrayal",
        "Complicated by incompatible obligations",
        "Dependent on words no one has said aloud",
        "Marked by affection expressed through practical help",
        "Threatened by an opportunity that cannot be shared",
        "Comfortable enough to reveal old habits",
        "Held together by a mutual secret",
        "Newly visible to outsiders",
        "Rooted in a place one person wants to leave",
        "Shaped by cultural or family expectations",
        "Generous in ways that create new pressure",
        "Resilient but not uncomplicated",
        "Defined by a promise made under different circumstances",
        "Deepened by a shared responsibility",
        "Misread as rivalry by everyone else",
        "Strained by unequal access to time, money, or freedom",
        "Dependent on someone learning to accept care",
        "Expressed through teasing, argument, or competition",
        "Protected by deliberate distance",
        "Growing faster than either person expected",
        "Tested by a public misunderstanding",
        "Connected to a family history neither person chose",
        "Made possible by an unlikely mediator",
        "Warmest during moments of shared work",
        "Fragile because it has never faced conflict",
        "Renewed after a long silence",
        "Respected by others but privately uncertain",
        "Centered on belonging rather than agreement",
        "Formed across a boundary others consider permanent",
        "Dependent on forgiveness without forgetting",
        "Changed by one person’s new independence",
        "Built from many imperfect attempts",
        "More reciprocal than either person realizes",
        "Threatened by the desire to protect each other",
        "Waiting for a clear choice",
        "About to be redefined rather than ended",
      ],
      story: [
        "An invitation arrives just as someone has decided to move on.",
        "Two people must work together to preserve a place tied to their shared past.",
        "A family member returns with a version of events no one else remembers.",
        "A private relationship becomes public through an act of kindness.",
        "Someone offers forgiveness before the other person is ready to apologize.",
        "A celebration forces estranged relatives to cooperate on one meaningful task.",
        "A friendship changes when one person is offered the life both once wanted.",
        "Two people exchange responsibilities and discover how little they understood each other.",
        "A community welcomes a newcomer while quietly testing whether they will stay.",
        "A long-kept promise conflicts with a new and honest desire.",
        "Someone tries to leave without burdening others and causes greater hurt instead.",
        "A shared project becomes the only safe way for two people to communicate.",
        "A person must decide whether belonging requires revealing a painful truth.",
        "An old love letter reaches the correct person at the wrong stage of life.",
        "A rivalry ends, leaving both participants unsure how to relate without it.",
        "A caregiver receives unexpected care from the person they believed depended on them.",
        "A household must choose between preserving harmony and making room for change.",
        "Two communities create a joint tradition after disagreeing about everything else.",
        "Someone realizes the home they miss no longer exists in the same form.",
        "A relationship survives the crisis but must still change afterward.",
      ],
    },
  },
  {
    id: "builtin-power-ambition",
    title: "Power & Ambition",
    description:
      "Leadership, institutions, status, rivalry, influence, responsibility, and the costs of pursuing control or recognition.",
    builtin: true,
    cards: {
      what: [
        "A monarch",
        "A mayor",
        "An executive",
        "A general",
        "A union organizer",
        "An heir",
        "A diplomat",
        "A palace",
        "A parliament",
        "A boardroom",
        "A campaign office",
        "A courtroom",
        "A military academy",
        "A stock exchange",
        "A crown",
        "A contract",
        "A ballot box",
        "An official seal",
        "A medal",
        "A manifesto",
      ],
      attribute: [
        "Built on favors that have not yet been repaid",
        "Publicly admired and privately feared",
        "Dependent on a fragile coalition",
        "Legitimate by tradition but not by consent",
        "More influential than its official role suggests",
        "Protected by layers of plausible deniability",
        "Rewarding loyalty over competence",
        "Stable only while resources remain abundant",
        "Divided between visible and invisible leadership",
        "Driven by one person’s need to prove themselves",
        "Vulnerable to a well-timed refusal",
        "Maintained through carefully managed information",
        "Respected because no alternative appears possible",
        "Shaped by an old victory no one can repeat",
        "Dependent on a public image that is becoming unsustainable",
        "Expanding faster than its rules can adapt",
        "Built around access to a scarce resource",
        "Held by someone who never wanted it",
        "Contested through ceremony rather than violence",
        "Strengthened by opponents who cannot cooperate",
        "Limited by an oath, charter, or public promise",
        "Inherited along with unresolved debts",
        "Threatened by success rather than failure",
        "Shared by people with incompatible visions",
        "Enforced through social pressure instead of law",
        "Supported by people who expect different rewards",
        "Dependent on one person remaining neutral",
        "Hidden beneath a language of service",
        "Measured through symbols rather than outcomes",
        "Recently transferred but not fully accepted",
        "Protected by a scandal that would harm everyone",
        "Vulnerable to someone with no ambition at all",
        "Increasingly disconnected from daily consequences",
        "Justified by an emergency that may never end",
        "Focused on winning the next decision at any cost",
        "Capable of reform but resistant to embarrassment",
        "Surrounded by ambitious people pretending to be content",
        "Dependent on controlling the official story",
        "Offering influence without real security",
        "About to pass to someone underestimated",
      ],
      story: [
        "An underdog is offered victory in exchange for preserving the system they opposed.",
        "A leader must choose between a popular decision and an effective one.",
        "A rival reveals corruption but demands personal power in return.",
        "The apparent figurehead discovers that people have begun obeying them for real.",
        "A reform succeeds so quickly that its creators lose control of it.",
        "Someone inherits authority along with a promise made by their predecessor.",
        "A public defeat creates a private opportunity for greater influence.",
        "Two allies win power together and immediately disagree about how to use it.",
        "A respected institution asks its harshest critic to lead it.",
        "A candidate learns that their strongest supporter expects to govern through them.",
        "A peaceful transfer of power depends on concealing one dangerous fact.",
        "A person with no official title becomes the deciding voice in every meeting.",
        "A ceremonial contest begins producing consequences no one intended.",
        "The protagonist can expose a rival only by admitting their own complicity.",
        "A leader’s attempt to appear decisive creates a crisis that requires humility.",
        "A powerful coalition survives its enemy and starts turning on itself.",
        "An ambitious character reaches their goal and discovers the position is largely powerless.",
        "A subordinate receives orders from two authorities who each deny the other’s legitimacy.",
        "A public concession strengthens the person who appears to have lost.",
        "The final vote is controlled by someone everyone forgot to persuade.",
      ],
    },
  },
  {
    id: "builtin-survival-peril",
    title: "Survival & Peril",
    description:
      "Danger, scarcity, isolation, pursuit, environmental pressure, and difficult choices made when safety is uncertain.",
    builtin: true,
    cards: {
      what: [
        "A medic",
        "A ranger",
        "A firefighter",
        "A sailor",
        "A scout",
        "An engineer",
        "A rescue worker",
        "A bunker",
        "A lifeboat",
        "A mountain shelter",
        "A desert camp",
        "A coastal city",
        "A research station",
        "A forest",
        "A flare gun",
        "A radio",
        "A ration pack",
        "A water filter",
        "A first-aid kit",
        "A signal mirror",
      ],
      attribute: [
        "Running on supplies counted to the final portion",
        "Exposed to a danger that cannot be confronted directly",
        "Stable only while everyone follows the same plan",
        "Cut off from trustworthy information",
        "Dependent on damaged or improvised equipment",
        "Safer in motion than at rest",
        "Surrounded by hazards that look harmless",
        "Threatened by exhaustion more than injury",
        "Difficult to defend without becoming trapped",
        "Supported by a resource no one knows how to replace",
        "Divided by unequal risk",
        "Operating with no margin for error",
        "Protected by rules written for a different crisis",
        "Dependent on someone hiding their condition",
        "Vulnerable to panic spreading faster than facts",
        "Limited by how much can be carried",
        "Safer for the group than for any individual",
        "Changing as quickly as plans are made",
        "Visible to an enemy but not to rescuers",
        "Dependent on choosing whom to trust",
        "Surrounded by evidence that others failed nearby",
        "Threatened by weather, terrain, or systems rather than a person",
        "Forced to trade comfort for mobility",
        "Protected by a barrier with an unknown lifespan",
        "Difficult to abandon because of who would be left behind",
        "Sustained by one person’s specialized knowledge",
        "Safer during a brief recurring interval",
        "Under pressure from conflicting emergency orders",
        "Marked by a shortage no one wants to announce",
        "Dependent on cooperation between frightened strangers",
        "More dangerous after apparent rescue",
        "Compromised by an earlier act of mercy",
        "Unable to support both secrecy and speed",
        "Threatened by a problem growing inside the group",
        "Designed to survive only one kind of disaster",
        "Dependent on a route that can be used once",
        "Difficult to reach without revealing its location",
        "Held together by morale rather than materials",
        "Offering safety at a severe personal cost",
        "Approaching a deadline no one can postpone",
      ],
      story: [
        "The safest route closes moments after the group commits to it.",
        "A rescue signal comes from someone officially declared lost.",
        "The group discovers that the emergency plan saves the system but not the people inside it.",
        "One person has enough supplies to survive alone and must decide whether to reveal them.",
        "A rival group offers cooperation but demands control of the escape plan.",
        "The apparent shelter is secure only if no one new is admitted.",
        "A character conceals an injury because the group cannot afford to slow down.",
        "The danger passes, but the route home has been permanently changed.",
        "A warning arrives too late for prevention but in time for one difficult choice.",
        "The person best equipped to lead is the least trusted member of the group.",
        "A failed rescue attempt leaves behind information more valuable than equipment.",
        "The group must choose between saving evidence and saving time.",
        "Someone outside the danger zone keeps making decisions for those trapped inside.",
        "An evacuation succeeds until the characters discover who was not included.",
        "A temporary compromise with the threat begins to look permanent.",
        "The final safe place is occupied by people with a different account of the crisis.",
        "A person thought selfish becomes essential because they prepared for the wrong reason.",
        "The group’s only escape depends on returning to the place they fled.",
        "A rescue requires one character to remain behind without knowing whether help will return.",
        "Survival becomes possible only after the characters stop following the official plan.",
      ],
    },
  },
  {
    id: "builtin-change-identity",
    title: "Change & Identity",
    description:
      "Transformation, self-discovery, reinvention, conflicting roles, coming of age, and the tension between who someone was and who they may become.",
    builtin: true,
    cards: {
      what: [
        "An apprentice",
        "An immigrant",
        "An actor",
        "A shapeshifter",
        "A retiree",
        "A prodigy",
        "A twin",
        "A dressing room",
        "A crossroads",
        "A hometown",
        "A boarding school",
        "A rehabilitation center",
        "A border town",
        "A workshop",
        "A mirror",
        "A passport",
        "A costume",
        "A name tag",
        "A tattoo design",
        "A journal",
      ],
      attribute: [
        "Unfamiliar yet unexpectedly freeing",
        "Visible to others before it is understood internally",
        "Chosen for one reason and continued for another",
        "Complicated by people who prefer the earlier version",
        "Gradual enough to be denied",
        "Publicly celebrated and privately disorienting",
        "Dependent on learning new habits",
        "Marked by grief for something willingly left behind",
        "Encouraged by someone with conflicting motives",
        "Difficult to explain without sounding ungrateful",
        "Interrupted by reminders of an old role",
        "Liberating in one setting and dangerous in another",
        "Built through experimentation rather than certainty",
        "Challenged by records that preserve the past",
        "Recognized differently by family, friends, and strangers",
        "Accelerated by an unexpected responsibility",
        "More reversible than everyone assumes",
        "Accompanied by a new kind of loneliness",
        "Strengthened by finding others in transition",
        "Undermined by the pressure to become a symbol",
        "Reflected in changes to clothing, language, ritual, or space",
        "Dependent on permission that may never come",
        "Quietly resisted by someone who feels abandoned",
        "Shaped by a mistake that became meaningful",
        "Easier to perform than to believe",
        "Complicated by advantages attached to the former identity",
        "Validated through action rather than declaration",
        "Interrupted by a crisis that rewards old behavior",
        "More complete in private than in public",
        "Supported by people who misunderstand the goal",
        "Driven by curiosity instead of dissatisfaction",
        "Threatened by nostalgia for a life that never existed",
        "Expressed through a new relationship to authority",
        "Dependent on accepting contradiction",
        "Made visible through an ordinary decision",
        "Rejected by institutions but accepted by individuals",
        "Changing the people nearby as well",
        "Rooted in a truth discovered too late",
        "Still open to revision",
        "About to be tested by a return to the beginning",
      ],
      story: [
        "A character returns home and discovers that everyone has preserved a different version of them.",
        "A new role brings the recognition the protagonist wanted but not the freedom they expected.",
        "Someone tries to recreate their former life and realizes it no longer suits them.",
        "A public mistake gives a character permission to stop pretending.",
        "A person’s transformation solves one problem while exposing a deeper conflict.",
        "The protagonist must introduce themselves honestly to someone who already knows their past.",
        "A community celebrates change symbolically while resisting it in practice.",
        "A mentor cannot accept that the student has outgrown the relationship.",
        "A character is offered their old position back after building a new identity elsewhere.",
        "An unexpected reunion forces someone to compare who they are with who they claimed they would become.",
        "A person learns that the trait they tried to eliminate is essential to their new life.",
        "A family secret explains the protagonist’s past but does not determine their future.",
        "Someone adopts a new name or title and must decide who is allowed to use the old one.",
        "A rite of passage is interrupted, leaving the character between recognized roles.",
        "A character’s private reinvention becomes public before they are ready.",
        "A new ability or responsibility changes how old friends interpret every past event.",
        "The protagonist must choose between proving they have changed and protecting someone who has not.",
        "A place tied to the character’s identity is altered or destroyed, forcing them to define home differently.",
        "Someone discovers that becoming their ideal self would require betraying their actual values.",
        "The story ends not with a final identity, but with the freedom to keep changing.",
      ],
    },
  },
  {
    id: "builtin-memory-legacy",
    title: "Memory & Legacy",
    description:
      "History, ancestry, inheritance, reputation, tradition, grief, preservation, and the consequences that outlive their makers.",
    builtin: true,
    cards: {
      what: [
        "A historian",
        "A grandparent",
        "A biographer",
        "A conservator",
        "A veteran",
        "A storyteller",
        "A genealogist",
        "A museum",
        "A manor",
        "A memorial",
        "A records office",
        "A mausoleum",
        "A library",
        "A heritage site",
        "A family tree",
        "A time capsule",
        "A portrait",
        "A will",
        "A scrapbook",
        "A gravestone",
      ],
      attribute: [
        "Preserved imperfectly through repetition",
        "Honored publicly and questioned privately",
        "Dependent on a keeper who wants to retire",
        "Recorded by people excluded from official accounts",
        "More influential than factually accurate",
        "Tied to an object that is slowly deteriorating",
        "Protected by etiquette rather than law",
        "Reinterpreted by each new generation",
        "Connected to a debt no living person incurred",
        "Kept alive through annual performance",
        "Incomplete in a way that benefits someone",
        "Remembered through sensory details rather than dates",
        "Celebrated for reasons different from its origin",
        "Divided between private grief and public meaning",
        "Preserved in copies that do not quite match",
        "Carried by someone who never consented to represent it",
        "Threatened by well-intentioned modernization",
        "Hidden inside a more acceptable family story",
        "Valuable because it cannot be recreated",
        "Shaped by the last person to describe it",
        "Passing from collective memory into myth",
        "Stored in a place with restricted access",
        "Connected to a reputation that outlived the truth",
        "Protected by people who fear forgetting more than distortion",
        "Remembered differently across borders or communities",
        "Activated by a current conflict",
        "Preserved through ordinary domestic habits",
        "Dependent on translating an untranslatable idea",
        "Surviving through imitation rather than instruction",
        "Burdened by expectations of authenticity",
        "Revealed by damage to something meant to contain it",
        "Owned legally by one group and emotionally by another",
        "Connected to names whose meanings have changed",
        "Kept secret to protect the dead rather than the living",
        "More compassionate in memory than in reality",
        "Threatened by success that would commercialize it",
        "Inherited alongside a role no one understands",
        "Preserved because someone refused to move on",
        "Waiting for a witness willing to contradict the official version",
        "About to be passed on under new terms",
      ],
      story: [
        "A record reveals that someone was deliberately removed from the accepted history.",
        "An inheritance can be claimed only by completing an unfinished act of care.",
        "A community must decide whether preserving a tradition also preserves its harm.",
        "The protagonist is asked to tell a story they know is comforting but incomplete.",
        "A memorial project exposes disagreement about who the event was really for.",
        "Someone discovers that a treasured family object was borrowed and never returned.",
        "A forgotten promise becomes enforceable through an unexpected witness.",
        "The last practitioner of a craft chooses an unsuitable successor on purpose.",
        "A historical discovery threatens the identity built around an admired figure.",
        "A character inherits responsibility for maintaining a lie that once protected someone.",
        "An old recording contains a message meant for a listener not yet born.",
        "A public anniversary brings together people who experienced the original event differently.",
        "A person tries to preserve a place exactly as it was and drives away those who still need it.",
        "The protagonist finds evidence that their own memory changed to make survival easier.",
        "A legacy intended as a gift becomes a competition among the people who receive it.",
        "Someone must choose between returning an artifact and keeping the story attached to it alive.",
        "A family name opens doors while concealing the actions that made it famous.",
        "The official archive survives, but the informal stories begin disappearing.",
        "A character learns that being remembered accurately matters less than what others do next.",
        "The final act of preservation requires allowing the original form to change.",
      ],
    },
  },
  {
    id: "builtin-wonder-the-uncanny",
    title: "Wonder & the Uncanny",
    description:
      "Awe, strangeness, magic, impossible science, supernatural events, surreal patterns, and the unsettling edge of the unexplained.",
    builtin: true,
    cards: {
      what: [
        "A magician",
        "An astronomer",
        "A medium",
        "An alchemist",
        "An oracle",
        "A dreamer",
        "An inventor",
        "A portal",
        "A labyrinth",
        "A moon",
        "A tower",
        "A city",
        "A mirror maze",
        "A planetarium",
        "A crystal",
        "A spellbook",
        "An automaton",
        "A music box",
        "A meteorite",
        "A telescope",
      ],
      attribute: [
        "Beautiful enough to delay sensible caution",
        "Unsettling because it behaves politely",
        "Consistent in ways ordinary reality is not",
        "Visible only from the corner of the eye",
        "Responsive to attention but not intention",
        "More curious than hostile",
        "Governed by a rule no one has fully identified",
        "Familiar to people who have never encountered it",
        "Accompanied by a subtle change in sound",
        "Harmless until someone tries to measure it",
        "Appearing differently to each observer",
        "Dependent on a ritual discovered by accident",
        "Leaving evidence that contradicts direct experience",
        "Capable of granting requests too literally",
        "Linked to a place rather than an object",
        "Easier to accept than to explain",
        "Repeated at intervals no calendar predicts",
        "Drawn toward unresolved emotion",
        "Impossible to photograph in the same form twice",
        "Regarded as ordinary by one isolated community",
        "Offering knowledge without context",
        "Changing scale when named",
        "Protected by disbelief",
        "More ancient than the symbols used to describe it",
        "Appearing only after something has been lost",
        "Sensitive to lies but indifferent to truth",
        "Creating coincidences around a single person",
        "Dangerous through generosity rather than malice",
        "Bound to an object that seems replaceable",
        "Growing more precise as witnesses disagree",
        "Experienced collectively but remembered privately",
        "Capable of imitating everything except motive",
        "Visible in reflections but absent from mirrors",
        "Affected by music, silence, or repeated language",
        "Leaving behind ordinary objects with impossible histories",
        "Helpful in ways that create dependence",
        "Unchanged by time but altered by expectation",
        "Recognizable through a sensation no one can describe",
        "Closing the distance between symbolic and literal meaning",
        "About to reveal whether it is unique or widespread",
      ],
      story: [
        "A miracle repeats, but each occurrence carries a different cost.",
        "The phenomenon responds to a question no one remembers asking.",
        "A skeptic becomes the only person able to perceive the impossible event.",
        "An uncanny visitor follows every social rule except one that matters deeply.",
        "A community depends on a mystery it publicly denies exists.",
        "The characters discover that the strange event has been trying to communicate through mistakes.",
        "An impossible object chooses a new owner based on a misunderstood quality.",
        "A scientific explanation works perfectly but makes the phenomenon more disturbing.",
        "The wonder disappears whenever someone attempts to profit from it.",
        "A child, outsider, or overlooked person understands the rules first.",
        "The phenomenon grants access to a lost place but not to the same version of it.",
        "A supernatural warning prevents one disaster while causing another.",
        "Someone learns to control the impossible event and immediately wishes they had not.",
        "The strange occurrence is revealed to be a side effect of something even more ordinary.",
        "A town’s local miracle begins happening elsewhere and threatens its identity.",
        "The characters must decide whether proving the phenomenon is real would destroy it.",
        "An uncanny pattern links people who believe they have nothing in common.",
        "The impossible becomes routine, and its sudden absence causes the crisis.",
        "A person receives exactly the sign they requested but cannot agree on what it means.",
        "The final revelation explains the rules while preserving the mystery’s emotional meaning.",
      ],
    },
  },
  {
    id: "builtin-humor-absurdity",
    title: "Humor & Absurdity",
    description:
      "Comedy, satire, misunderstandings, awkwardness, whimsy, irony, escalating complications, and serious people facing ridiculous circumstances.",
    builtin: true,
    cards: {
      what: [
        "A clown",
        "A bureaucrat",
        "An amateur detective",
        "A wedding planner",
        "A mascot",
        "A chef",
        "A game show host",
        "A comedy club",
        "An office",
        "A theme park",
        "A pet salon",
        "A motel",
        "A banquet hall",
        "A television studio",
        "A rubber chicken",
        "A trophy",
        "A megaphone",
        "An instruction manual",
        "A cake",
        "A parking ticket",
      ],
      attribute: [
        "Overly formal for the situation",
        "Managed by people pretending this is normal",
        "Dependent on a rule everyone interprets differently",
        "Escalating through well-intentioned assistance",
        "Impressively organized around a pointless goal",
        "Taken seriously by exactly the wrong person",
        "Difficult to explain without sounding dishonest",
        "Made worse by excellent communication",
        "Protected by tradition no one remembers starting",
        "Full of experts in unrelated subjects",
        "Technically successful and practically disastrous",
        "Held together by improvisation presented as policy",
        "Complicated by someone refusing to admit embarrassment",
        "More expensive to cancel than to continue",
        "Dependent on a misunderstanding everyone benefits from",
        "Run according to instructions translated several times",
        "Publicly dignified and privately chaotic",
        "Ruined by a detail considered too trivial to discuss",
        "Improved by the least qualified participant",
        "Scheduled with impossible precision",
        "Driven by rivalry over something worthless",
        "Surrounded by unnecessary secrecy",
        "Repeated because the first failure looked intentional",
        "Dependent on an object with a silly name",
        "Made credible by confidence rather than evidence",
        "Complicated by a literal interpretation",
        "Supported by a surprisingly effective rumor",
        "Conducted under rules invented during the event",
        "More efficient when no one is in charge",
        "Threatened by the arrival of a competent person",
        "Elevated into a crisis by public relations",
        "Filled with dramatic pauses no one planned",
        "Dependent on everyone avoiding the obvious solution",
        "Improved by an accident no one can reproduce",
        "Maintained by paperwork that contradicts reality",
        "Embarrassing for reasons outsiders cannot understand",
        "Serious in purpose and ridiculous in execution",
        "Solved repeatedly without anyone noticing",
        "About to become someone else’s responsibility",
        "One reasonable question away from collapsing",
      ],
      story: [
        "A small lie becomes official policy before the speaker can correct it.",
        "The least qualified person is mistaken for the expert and gives unexpectedly useful advice.",
        "A competition escalates because neither side wants to admit the prize is undesirable.",
        "Everyone prepares for the wrong emergency, which turns out to be useful anyway.",
        "A character attempts to avoid attention and accidentally becomes the event’s main attraction.",
        "A bureaucratic error grants someone power that no department knows how to revoke.",
        "Two rivals secretly cooperate to preserve the appearance of conflict.",
        "A simple task requires an increasingly elaborate chain of permissions.",
        "The villain’s plan works, but the result is socially awkward rather than catastrophic.",
        "A ceremonial object goes missing and is replaced with something obviously inappropriate.",
        "A misunderstanding could be corrected at any time, but the truth would inconvenience everyone.",
        "A serious investigation keeps uncovering explanations that are stranger but less criminal.",
        "The protagonist’s backup plan is mistaken for the original strategy and widely praised.",
        "A formal negotiation succeeds only after both sides abandon professional behavior.",
        "Someone invents a fake tradition, then discovers everyone else already believes in it.",
        "A perfectly competent plan fails because one participant follows it exactly.",
        "A public apology causes more confusion than the original offense.",
        "A minor inconvenience becomes a symbol for a movement no one intended to start.",
        "The characters solve the crisis while arguing about who is allowed to take credit.",
        "The final reveal is completely ordinary, but explaining it creates one last absurd complication.",
      ],
    },
  },
  {
    id: "builtin-far-realms",
    title: "Far Realms",
    description:
      "Deep fantasy foundations: enchanted kingdoms, heroic figures, legendary creatures, ancient magic, royal conflict, and distant realms.",
    builtin: true,
    cards: {
      what: [
        "A wizard",
        "A knight",
        "A dragon rider",
        "An elf",
        "A dwarf",
        "A royal heir",
        "A monster hunter",
        "A castle",
        "An enchanted forest",
        "A mountain kingdom",
        "A ruined citadel",
        "A wizard's tower",
        "An underground city",
        "A battlefield",
        "An enchanted sword",
        "A grimoire",
        "A jeweled crown",
        "A dragon egg",
        "A runed shield",
        "A healing potion",
      ],
      attribute: [
        "Bound by an ancient oath",
        "Shielded by forgotten magic",
        "Known across seven kingdoms",
        "Marked by dragonfire",
        "Guarded by a sacred order",
        "Hidden beyond the mortal roads",
        "Crowned in moonlit silver",
        "Feared by every neighboring realm",
        "Carved with protective runes",
        "Older than the reigning dynasty",
        "Claimed by rival bloodlines",
        "Linked to a vanished kingdom",
        "Awakened only at dusk",
        "Powered by a captive star",
        "Surrounded by prophetic dreams",
        "Protected by an impossible bargain",
        "Divided between court and wilderness",
        "Built upon a sleeping giant",
        "Rich with dangerous enchantments",
        "Fading as its magic weakens",
        "Honored in songs and legends",
        "Condemned by the royal court",
        "Watched by unseen guardians",
        "Untouched by ordinary weapons",
        "Dependent on a rare celestial event",
        "Accessible through a single gate",
        "Changed by centuries of war",
        "Ruled by conflicting traditions",
        "Blessed by one deity and cursed by another",
        "Full of ceremonial importance",
        "Stronger when its true name is spoken",
        "Visible only to the chosen",
        "Restored by acts of courage",
        "Poisoned by corrupted magic",
        "Shared between two rival realms",
        "Destined to outlive its creator",
        "Surrounded by creatures of legend",
        "Bound to the fate of the throne",
        "Hidden beneath an ordinary appearance",
        "Waiting for a worthy bearer",
      ],
      story: [
        "A broken oath threatens peace between three kingdoms.",
        "A missing heir returns with a claim no one can verify.",
        "An ancient creature awakens beneath the capital.",
        "A forbidden spell offers victory at an irreversible cost.",
        "Two rival orders must defend the same sacred site.",
        "A royal marriage conceals a plan to divide the realm.",
        "A map reveals a kingdom erased from every history.",
        "A commoner discovers the mark of a legendary bloodline.",
        "Magic begins disappearing from the places that depend on it.",
        "An army crosses a border that has been sealed for centuries.",
        "A prophecy names several possible heroes instead of one.",
        "A defeated tyrant's weapon chooses a new bearer.",
        "A pilgrimage becomes a race against a rival faith.",
        "A dragon demands the return of something stolen generations ago.",
        "A peace treaty requires surrendering a beloved protector.",
        "A hidden gate opens onto a realm thought destroyed.",
        "A court celebration is interrupted by an impossible challenge.",
        "An apprentice must finish the quest their mentor abandoned.",
        "A sacred relic is discovered to be a convincing imitation.",
        "Saving the realm requires restoring an enemy to power.",
      ],
    },
  },
  {
    id: "builtin-mythology-origins",
    title: "Mythology & Origins",
    description:
      "Ancient civilizations, creation traditions, sacred rites, ancestral heroes, temples, monuments, lost records, and the stories cultures tell about their beginnings.",
    builtin: true,
    cards: {
      what: [
        "A demigod",
        "A high priestess",
        "A temple scribe",
        "A conquering king",
        "A prophet",
        "A sacred guardian",
        "An ancestral hero",
        "An ancient temple",
        "A sacred mountain",
        "A river city",
        "A stone circle",
        "An oracle's sanctuary",
        "A royal tomb",
        "A ruined amphitheater",
        "A clay tablet",
        "A ceremonial mask",
        "A bronze spear",
        "A sun disk",
        "A funerary vessel",
        "A carved idol",
      ],
      attribute: [
        "Consecrated before recorded history",
        "Associated with the first sunrise",
        "Dedicated to a forgotten deity",
        "Inscribed in a dead language",
        "Preserved through oral tradition",
        "Linked to the founding of a city",
        "Buried beneath later civilizations",
        "Revered by competing cultures",
        "Depicted differently in every surviving source",
        "Used only during seasonal rites",
        "Claimed to descend from the heavens",
        "Shaped by generations of retelling",
        "Protected by ritual law",
        "Disputed by modern scholars",
        "Aligned with the movement of the stars",
        "Made from materials brought from afar",
        "Forbidden to ordinary citizens",
        "Central to an ancient succession",
        "Damaged during a forgotten invasion",
        "Copied from an older original",
        "Associated with fertility and harvest",
        "Connected to burial and remembrance",
        "Interpreted as both blessing and warning",
        "Guarded by hereditary keepers",
        "Celebrated through public procession",
        "Feared as an omen of collapse",
        "Divided into sacred fragments",
        "Recognized by its animal symbolism",
        "Bound to the calendar of festivals",
        "Hidden beneath layers of ceremony",
        "Remembered through contradictory hymns",
        "Believed to mark the center of the world",
        "Carried across generations of exile",
        "Reserved for rulers at coronation",
        "Shaped by river, desert, or sea",
        "Surviving only in partial records",
        "Reconstructed from scattered ruins",
        "Shared by cultures that deny any connection",
        "Invoked during times of plague or war",
        "Older than the people who now honor it",
      ],
      story: [
        "The official creation story begins to unravel.",
        "A newly translated tablet changes the identity of a legendary ruler.",
        "Two cities claim the same ancestral hero.",
        "An eclipse revives a ritual abandoned for centuries.",
        "A royal tomb contains the remains of the wrong person.",
        "A sacred river changes course and exposes a buried settlement.",
        "Priests disagree over the meaning of a long-awaited omen.",
        "A conquered people preserve their history inside the victor's monuments.",
        "A festival reenactment reveals a forgotten crime.",
        "A scholar discovers that several gods share a single origin.",
        "An ancient treaty must be interpreted before war resumes.",
        "A relic returned from exile challenges the current dynasty.",
        "A child is named in a prophecy older than the kingdom.",
        "Excavation beneath a temple uncovers an earlier faith.",
        "A ceremonial object disappears on the night it is needed.",
        "A legendary monster may have been a misunderstood historical figure.",
        "The oldest surviving map places the homeland somewhere impossible.",
        "A ruler commissions a new myth to erase an inconvenient past.",
        "An ancestral curse is revealed to be a broken legal promise.",
        "Competing origin stories must be reconciled to unite the region.",
      ],
    },
  },
  {
    id: "builtin-folklore-fable",
    title: "Folklore & Fable",
    description:
      "Village tales, moral lessons, tricksters, household customs, talking animals, enchanted objects, repeated patterns, and stories passed from teller to teller.",
    builtin: true,
    cards: {
      what: [
        "A woodcutter",
        "A shepherd",
        "A clever child",
        "A wandering peddler",
        "A miller",
        "A village healer",
        "A youngest sibling",
        "A cottage",
        "A village well",
        "A country crossroads",
        "A mill",
        "A moonlit pond",
        "A forest path",
        "A village square",
        "A red cloak",
        "A silver bell",
        "A wooden flute",
        "A basket",
        "A spindle",
        "A pair of boots",
      ],
      attribute: [
        "Passed down from one storyteller to another",
        "Simple enough to be remembered by children",
        "Changed slightly in every village",
        "Hidden behind a familiar warning",
        "Helpful only when treated with kindness",
        "Punishing toward greed and arrogance",
        "Guided by the rule of three",
        "Associated with the edge of the forest",
        "Known by a different name in each region",
        "Protected by an old household custom",
        "Ordinary until a promise is broken",
        "Most powerful at midnight",
        "Recognizable by a repeated phrase",
        "Feared by adults and trusted by children",
        "Offered in exchange for hospitality",
        "Carried by wandering storytellers",
        "Linked to a seasonal celebration",
        "Marked by footprints that vanish at dawn",
        "Bound by literal interpretations of promises",
        "Stronger when no one believes in it",
        "Appearing only to travelers alone",
        "Used to teach a practical lesson",
        "Capable of rewarding patience",
        "Quick to punish broken manners",
        "Associated with bread, salt, and shelter",
        "Disguised as something harmless",
        "Remembered through a counting rhyme",
        "Dependent on a small act of generosity",
        "Impossible to keep after sunrise",
        "Shared by neighboring cultures in different forms",
        "Connected to animals that speak",
        "Surrounded by rules no one fully explains",
        "Protected by a humble family",
        "Considered unlucky to mention directly",
        "Revealed through a test of character",
        "Always returning to its original owner",
        "More clever than it appears",
        "Lost whenever someone boasts about it",
        "Understood differently by each generation",
        "Ending with a lesson nobody follows",
      ],
      story: [
        "A poor household welcomes a stranger no one else would shelter.",
        "The youngest sibling succeeds by listening to an overlooked warning.",
        "Three impossible tasks must be completed before sunrise.",
        "A boast made at a village feast summons an unexpected challenger.",
        "An animal offers advice that sounds foolish but proves exact.",
        "A stolen household object begins granting inconvenient wishes.",
        "A traveler must choose which of three contradictory stories is true.",
        "A broken custom causes misfortune to spread from home to home.",
        "A clever bargain depends on the exact meaning of a single word.",
        "A child follows a song into a part of the forest adults avoid.",
        "A generous act is rewarded in a form no one recognizes.",
        "A familiar cautionary tale begins happening to the village.",
        "A local trickster targets someone who seems impossible to deceive.",
        "A festival contest attracts a competitor from an older story.",
        "A promise to a mysterious helper comes due years later.",
        "An inherited rule protects the family for reasons no one remembers.",
        "A magical gift becomes dangerous when used for personal gain.",
        "A frightening creature asks to have its side of the tale heard.",
        "Two neighboring villages tell opposite versions of the same fable.",
        "A storyteller changes an ending and alters events beyond the tale.",
      ],
    },
  },
]);
const THEME_CUSTOM_STORAGE_KEY = "wormholesCustomThemeDecksV1";
const THEME_SELECTION_STORAGE_KEY = "wormholesSelectedThemeDeckIdsV1";
const THEME_EXPORT_FORMAT = "Wormholes Theme Deck";
const THEME_EXPORT_VERSION = 1;
const THEME_LIMITS = Object.freeze({
  maxCustomThemes: 50,
  maxCardsPerTheme: 1000,
  maxTitleLength: 80,
  maxDescriptionLength: 500,
  maxCardLength: 200,
  maxImportBytes: 2 * 1024 * 1024,
});
const THEME_TYPES = Object.freeze(["what", "attribute", "story"]);

let customThemeDecks = [];
let selectedThemeIds = [];
let themeStateLoaded = false;
let themeUiInstalled = false;
let themeManagerDraft = null;
let themeManagerOriginalId = null;
let pendingThemeDeleteId = null;
let themeDataRevision = 0;
let themePickerSelectionDirty = false;
let themePickerDraftIds = null;
let themePickerSourceContext = "";
const themeSelectMarkupCache = new Map();

function themeWindow() {
  return typeof window !== "undefined" ? window : globalThis;
}

function themeDocument() {
  return typeof document !== "undefined" ? document : null;
}

function cloneThemeDeck(deck) {
  return {
    id: String(deck?.id || ""),
    title: String(deck?.title || ""),
    description: String(deck?.description || ""),
    builtin: deck?.builtin === true,
    cards: {
      what: Array.isArray(deck?.cards?.what) ? [...deck.cards.what] : [],
      attribute: Array.isArray(deck?.cards?.attribute) ? [...deck.cards.attribute] : [],
      story: Array.isArray(deck?.cards?.story) ? [...deck.cards.story] : [],
    },
  };
}

function invalidateThemeRenderCaches() {
  themeDataRevision += 1;
  themeSelectMarkupCache.clear();
}

function cleanThemeText(value, maximum) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maximum);
}

function normalizeThemeType(value) {
  const type = String(value || "")
    .trim()
    .toLowerCase();
  if (type === "attr" || type === "attributes") return "attribute";
  if (type === "pressure") return "story";
  return THEME_TYPES.includes(type) ? type : "";
}

function themeSlug(value) {
  const slug = String(value || "")
    .toLowerCase()
    .normalize?.("NFKD")
    ?.replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "theme";
}

function createCustomThemeId(title = "theme") {
  let suffix = "";
  try {
    suffix = themeWindow().crypto?.randomUUID?.().replace(/-/g, "").slice(0, 12) || "";
  } catch (error) {}
  if (!suffix) suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `custom-${themeSlug(title)}-${suffix}`;
}

function normalizeCardList(value) {
  if (!Array.isArray(value)) return [];
  const cards = [];
  value.forEach((entry) => {
    const text = cleanThemeText(
      typeof entry === "string" ? entry : entry?.text,
      THEME_LIMITS.maxCardLength,
    );
    if (text) cards.push(text);
  });
  return cards.slice(0, THEME_LIMITS.maxCardsPerTheme);
}

function normalizeCustomThemeDeck(raw, options = {}) {
  if (!raw || typeof raw !== "object") return null;
  const title = cleanThemeText(raw.title || raw.name, THEME_LIMITS.maxTitleLength);
  if (!title) return null;
  const sourceCards = raw.cards && typeof raw.cards === "object" ? raw.cards : raw;
  const normalized = {
    id: cleanThemeText(raw.id, 120) || createCustomThemeId(title),
    title,
    description: cleanThemeText(raw.description, THEME_LIMITS.maxDescriptionLength),
    builtin: false,
    cards: {
      what: normalizeCardList(sourceCards.what || sourceCards.whats),
      attribute: normalizeCardList(sourceCards.attribute || sourceCards.attributes),
      story: normalizeCardList(sourceCards.story || sourceCards.stories || sourceCards.pressure),
    },
  };
  if (options.newId === true || normalized.id.startsWith("builtin-"))
    normalized.id = createCustomThemeId(title);
  return normalized;
}

function themePreferencesRepository() {
  return themeWindow().WormholesRepositories?.preferences || null;
}

function readThemeJson(key, fallback) {
  const repository = themePreferencesRepository();
  if (repository?.readJson) return repository.readJson(key, fallback);
  try {
    const value = themeWindow().localStorage?.getItem?.(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function writeThemeJson(key, value, userMessage) {
  const repository = themePreferencesRepository();
  if (repository?.writeJson) {
    const result = repository.writeJson(key, value, {
      context: "Could not save themes",
      userMessage: userMessage || "Themes could not be saved.",
    });
    return result === true || result?.ok === true;
  }
  try {
    themeWindow().localStorage?.setItem?.(key, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
}

function allThemeDecks() {
  loadThemeDeckState();
  return [...BUILTIN_THEME_DECKS, ...customThemeDecks].map(cloneThemeDeck);
}

function themeDeckById(id) {
  loadThemeDeckState();
  const key = String(id || "");
  return [...BUILTIN_THEME_DECKS, ...customThemeDecks].find((deck) => deck.id === key) || null;
}

function themeCardCount(deck, type = "") {
  const normalized = normalizeThemeType(type);
  if (normalized)
    return Array.isArray(deck?.cards?.[normalized]) ? deck.cards[normalized].length : 0;
  return THEME_TYPES.reduce((total, cardType) => total + themeCardCount(deck, cardType), 0);
}

function usableThemeDeck(deck) {
  return themeCardCount(deck) > 0;
}

function loadThemeDeckState(options = {}) {
  if (themeStateLoaded && options.force !== true) return;
  const rawCustom = readThemeJson(THEME_CUSTOM_STORAGE_KEY, []);
  const seen = new Set(BUILTIN_THEME_DECKS.map((deck) => deck.id));
  customThemeDecks = [];
  (Array.isArray(rawCustom) ? rawCustom : []).forEach((entry) => {
    const deck = normalizeCustomThemeDeck(entry);
    if (!deck || seen.has(deck.id) || customThemeDecks.length >= THEME_LIMITS.maxCustomThemes)
      return;
    seen.add(deck.id);
    customThemeDecks.push(deck);
  });

  const availableIds = new Set(
    [...BUILTIN_THEME_DECKS, ...customThemeDecks].map((deck) => deck.id),
  );
  const rawSelection = readThemeJson(THEME_SELECTION_STORAGE_KEY, null);
  selectedThemeIds = Array.isArray(rawSelection)
    ? [...new Set(rawSelection.map(String).filter((id) => availableIds.has(id)))]
    : BUILTIN_THEME_DECKS.map((deck) => deck.id);
  if (!selectedThemeIds.some((id) => usableThemeDeck(themeDeckByIdWithoutLoad(id)))) {
    selectedThemeIds = [BUILTIN_THEME_DECKS[0].id];
  }
  themeStateLoaded = true;
  invalidateThemeRenderCaches();
}

function themeDeckByIdWithoutLoad(id) {
  const key = String(id || "");
  return [...BUILTIN_THEME_DECKS, ...customThemeDecks].find((deck) => deck.id === key) || null;
}

function activeThemeDeckRefs(type = "") {
  loadThemeDeckState();
  const normalized = normalizeThemeType(type);
  return selectedThemeIds
    .map((id) => themeDeckByIdWithoutLoad(id))
    .filter(Boolean)
    .filter((deck) => !normalized || themeCardCount(deck, normalized) > 0);
}

function saveCustomThemeDecks(options = {}) {
  const saved = writeThemeJson(
    THEME_CUSTOM_STORAGE_KEY,
    customThemeDecks.map(cloneThemeDeck),
    "Custom themes could not be saved.",
  );
  if (saved) {
    invalidateThemeRenderCaches();
    if (options.notify !== false) notifyThemeDecksChanged("custom-themes");
  }
  return saved;
}

function saveSelectedThemeIds(options = {}) {
  const saved = writeThemeJson(
    THEME_SELECTION_STORAGE_KEY,
    [...selectedThemeIds],
    "Theme choices could not be saved.",
  );
  if (saved) {
    invalidateThemeRenderCaches();
    if (options.notify !== false) notifyThemeDecksChanged("selection");
  }
  return saved;
}

function exportThemeDeckState() {
  loadThemeDeckState();
  return {
    version: THEME_EXPORT_VERSION,
    customDecks: customThemeDecks.map(cloneThemeDeck),
    selectedThemeIds: [...selectedThemeIds],
  };
}

function prepareImportedThemeDeckState(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    const error = new TypeError("Theme data must be an object.");
    error.userMessage = "The theme data in this backup is not valid.";
    throw error;
  }
  const rawCustom = raw.customDecks;
  const rawSelected = raw.selectedThemeIds;
  if (!Array.isArray(rawCustom) || !Array.isArray(rawSelected)) {
    const error = new TypeError("Theme data is missing customDecks or selectedThemeIds.");
    error.userMessage = "The theme data in this backup is incomplete.";
    throw error;
  }

  const customDecks = [];
  const seenIds = new Set(BUILTIN_THEME_DECKS.map((deck) => deck.id));
  const seenTitles = new Set(BUILTIN_THEME_DECKS.map((deck) => deck.title.toLowerCase()));
  rawCustom.slice(0, THEME_LIMITS.maxCustomThemes).forEach((entry, index) => {
    const deck = normalizeCustomThemeDeck(entry);
    if (!deck || seenIds.has(deck.id) || seenTitles.has(deck.title.toLowerCase())) {
      const error = new TypeError(`Invalid custom theme at index ${index}.`);
      error.userMessage = "A custom theme in this backup is not valid.";
      throw error;
    }
    seenIds.add(deck.id);
    seenTitles.add(deck.title.toLowerCase());
    customDecks.push(deck);
  });

  const available = new Map(
    [...BUILTIN_THEME_DECKS, ...customDecks].map((deck) => [deck.id, deck]),
  );
  const selectedThemeIds = [...new Set(rawSelected.map(String))].filter(
    (id) => available.has(id) && usableThemeDeck(available.get(id)),
  );
  if (!selectedThemeIds.length) selectedThemeIds.push(BUILTIN_THEME_DECKS[0].id);

  return {
    version: THEME_EXPORT_VERSION,
    customDecks: customDecks.map(cloneThemeDeck),
    selectedThemeIds,
  };
}

function writePreparedCustomThemeDecks(prepared) {
  return writeThemeJson(
    THEME_CUSTOM_STORAGE_KEY,
    (prepared?.customDecks || []).map(cloneThemeDeck),
    "Custom themes could not be saved.",
  );
}

function writePreparedThemeSelection(prepared) {
  return writeThemeJson(
    THEME_SELECTION_STORAGE_KEY,
    [...(prepared?.selectedThemeIds || [])],
    "Theme choices could not be saved.",
  );
}

function applyPreparedThemeDeckState(prepared, options = {}) {
  const normalized = prepareImportedThemeDeckState(prepared);
  customThemeDecks = normalized.customDecks.map(cloneThemeDeck);
  selectedThemeIds = [...normalized.selectedThemeIds];
  themeStateLoaded = true;
  invalidateThemeRenderCaches();
  if (options.notify !== false) notifyThemeDecksChanged(options.reason || "restore");
  return true;
}

function activeThemeDecks(type = "") {
  return activeThemeDeckRefs(type).map(cloneThemeDeck);
}

function activeThemeIds() {
  loadThemeDeckState();
  return [...selectedThemeIds];
}

function allBuiltInThemeCards(type) {
  const normalized = normalizeThemeType(type);
  if (!normalized) return [];
  return BUILTIN_THEME_DECKS.flatMap((deck) => [...deck.cards[normalized]]);
}

function activeThemeCards(type) {
  const normalized = normalizeThemeType(type);
  if (!normalized) return [];
  return activeThemeDeckRefs(normalized).flatMap((deck) => [...deck.cards[normalized]]);
}

function normalizedThemeCardValue(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function chooseThemeCard(type, options = {}) {
  const normalized = normalizeThemeType(type);
  if (!normalized) return null;
  const randomInt =
    typeof options.randomInt === "function"
      ? options.randomInt
      : (maximum) => Math.floor(Math.random() * Math.max(1, maximum)) + 1;
  const excluded = new Set(
    (options.excludedValues || []).map(normalizedThemeCardValue).filter(Boolean),
  );
  let eligibleDecks = activeThemeDeckRefs(normalized)
    .map((deck) => ({
      deck,
      cards: deck.cards[normalized]
        .map((text, index) => ({text, index}))
        .filter((card) => !excluded.has(normalizedThemeCardValue(card.text))),
    }))
    .filter((entry) => entry.cards.length > 0);

  if (!eligibleDecks.length && excluded.size) {
    eligibleDecks = activeThemeDeckRefs(normalized)
      .map((deck) => ({
        deck,
        cards: deck.cards[normalized].map((text, index) => ({text, index})),
      }))
      .filter((entry) => entry.cards.length > 0);
  }
  if (!eligibleDecks.length) return null;

  const deckEntry =
    eligibleDecks[
      Math.max(0, Math.min(eligibleDecks.length - 1, randomInt(eligibleDecks.length) - 1))
    ];
  const card =
    deckEntry.cards[
      Math.max(0, Math.min(deckEntry.cards.length - 1, randomInt(deckEntry.cards.length) - 1))
    ];
  return {
    val: card.text,
    themeId: deckEntry.deck.id,
    themeTitle: deckEntry.deck.title,
    cardNumber: card.index + 1,
    cardType: normalized,
  };
}

function themeSelectionHasCards(type) {
  return activeThemeDeckRefs(type).some((deck) => themeCardCount(deck, type) > 0);
}

function showThemeToast(message) {
  const text = String(message || "").trim();
  if (!text) return;
  if (typeof themeWindow().showSavedToast === "function") themeWindow().showSavedToast(text);
  else themeWindow().WormholesActivityLog?.recordAction?.(text);
}

function notifyThemeDecksChanged(reason = "update", options = {}) {
  if (options.renderChips !== false) renderThemeChips();
  if (options.renderPicker === true) renderThemePicker();
  const win = themeWindow();
  try {
    win.dispatchEvent?.(
      new CustomEvent("wormholes:themes-changed", {
        detail: {reason, selectedThemeIds: activeThemeIds()},
      }),
    );
  } catch (error) {}
}

function setActiveThemeIds(ids, options = {}) {
  loadThemeDeckState();
  const available = new Map(
    [...BUILTIN_THEME_DECKS, ...customThemeDecks].map((deck) => [deck.id, deck]),
  );
  const next = [...new Set((Array.isArray(ids) ? ids : []).map(String))].filter(
    (id) => available.has(id) && usableThemeDeck(available.get(id)),
  );
  if (!next.length) {
    if (options.silent !== true) showThemeToast("Keep at least one theme selected.");
    return false;
  }
  const previous = selectedThemeIds;
  selectedThemeIds = next;
  if (saveSelectedThemeIds(options)) return true;
  selectedThemeIds = previous;
  return false;
}

function toggleActiveTheme(id, enabled, options = {}) {
  loadThemeDeckState();
  const deck = themeDeckByIdWithoutLoad(id);
  if (!deck || !usableThemeDeck(deck)) return false;
  const next = new Set(selectedThemeIds);
  if (enabled === false || (enabled === undefined && next.has(id))) next.delete(id);
  else next.add(id);
  return setActiveThemeIds([...next], options);
}

function removeActiveTheme(id) {
  return toggleActiveTheme(id, false);
}

function themeChipMarkup(deck) {
  return `<button class="theme-chip" data-theme-remove="${escapeThemeHtml(deck.id)}" type="button" aria-label="Remove ${escapeThemeHtml(deck.title)} theme"><span>${escapeThemeHtml(deck.title)}</span><span aria-hidden="true" class="theme-chip-remove">×</span></button>`;
}

function escapeThemeHtml(value) {
  const text = String(value ?? "");
  const escape = themeWindow().WormholesSafeRender?.escapeHtml || themeWindow().escapeHtml;
  if (typeof escape === "function") return escape(text);
  return text.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );
}

function renderThemeChips() {
  const doc = themeDocument();
  if (!doc?.querySelectorAll) return;
  const decks = activeThemeDeckRefs();
  doc.querySelectorAll("[data-theme-chip-list]").forEach((container) => {
    container.innerHTML = decks.map(themeChipMarkup).join("");
  });
  doc.querySelectorAll("[data-theme-active-count]").forEach((node) => {
    node.textContent = `${decks.length} active`;
  });
}

function renderThemePicker() {
  const doc = themeDocument();
  const list = doc?.getElementById?.("themePickerList");
  if (!list) return;
  loadThemeDeckState();
  const selected = themePickerDraftIds || new Set(selectedThemeIds);
  const sections = [
    {title: "Built-in Themes", decks: BUILTIN_THEME_DECKS},
    {title: "Custom Themes", decks: customThemeDecks},
  ];
  list.innerHTML = sections
    .map((section) => {
      const rows = section.decks.length
        ? section.decks
            .map((deck) => {
              const counts = `${themeCardCount(deck, "what")} What · ${themeCardCount(deck, "attribute")} Attribute · ${themeCardCount(deck, "story")} Story`;
              const disabled = !usableThemeDeck(deck);
              return `<label class="theme-picker-option${disabled ? " is-disabled" : ""}">
            <input type="checkbox" data-theme-picker-id="${escapeThemeHtml(deck.id)}" ${selected.has(deck.id) ? "checked" : ""} ${disabled ? "disabled" : ""}>
            <span class="theme-picker-copy"><strong>${escapeThemeHtml(deck.title)}</strong><span>${escapeThemeHtml(deck.description || counts)}</span><small>${escapeThemeHtml(counts)}</small></span>
          </label>`;
            })
            .join("")
        : `<p class="theme-picker-empty">No custom themes yet.</p>`;
      return `<section class="theme-picker-section"><h3>${section.title}</h3>${rows}</section>`;
    })
    .join("");
}

function sameThemeSelection(first, second) {
  if (first.size !== second.size) return false;
  for (const id of first) if (!second.has(id)) return false;
  return true;
}

function stageThemePickerSelection(id, enabled) {
  loadThemeDeckState();
  const deck = themeDeckByIdWithoutLoad(id);
  if (!deck || !usableThemeDeck(deck)) return false;
  const next = new Set(themePickerDraftIds || selectedThemeIds);
  if (enabled === false) next.delete(id);
  else next.add(id);
  if (!next.size) {
    showThemeToast("Keep at least one theme selected.");
    return false;
  }
  themePickerDraftIds = next;
  themePickerSelectionDirty = !sameThemeSelection(next, new Set(selectedThemeIds));
  return true;
}

function themePickerContext(trigger) {
  const declared = trigger?.closest?.("[data-theme-context]")?.dataset?.themeContext;
  if (declared === "create" || declared === "generate") return declared;
  const createTab = themeDocument()?.getElementById?.("createTab");
  return createTab && createTab.hidden !== true ? "create" : "generate";
}

function setThemePickerDocumentState(open, context = "") {
  const doc = themeDocument();
  const root = doc?.documentElement;
  const body = doc?.body;
  const modal = doc?.getElementById?.("themePickerModal");
  if (open) {
    themePickerSourceContext = context === "create" ? "create" : "generate";
    root?.classList.add("theme-picker-open");
    root?.classList.toggle("theme-picker-from-create", themePickerSourceContext === "create");
    body?.classList.add("theme-picker-open");
    body?.classList.toggle("theme-picker-from-create", themePickerSourceContext === "create");
    if (modal?.dataset) modal.dataset.themePickerContext = themePickerSourceContext;
    return;
  }
  root?.classList.remove("theme-picker-open", "theme-picker-from-create");
  body?.classList.remove("theme-picker-open", "theme-picker-from-create");
  if (modal?.dataset) delete modal.dataset.themePickerContext;
  themePickerSourceContext = "";
}

function openThemePicker(trigger) {
  initializeThemeDeckUi();
  themePickerDraftIds = new Set(selectedThemeIds);
  themePickerSelectionDirty = false;
  renderThemePicker();
  const modal = themeDocument()?.getElementById?.("themePickerModal");
  const list = themeDocument()?.getElementById?.("themePickerList");
  setThemePickerDocumentState(true, themePickerContext(trigger));
  modal?.classList.add("open");
  if (list) list.scrollTop = 0;
  setTimeout(() => modal?.querySelector?.("input:not([disabled]), button")?.focus?.(), 0);
}

function closeThemePicker() {
  themeDocument()?.getElementById?.("themePickerModal")?.classList.remove("open");
  setThemePickerDocumentState(false);
  const draftIds = themePickerDraftIds ? [...themePickerDraftIds] : [...selectedThemeIds];
  const changed = themePickerSelectionDirty;
  themePickerDraftIds = null;
  themePickerSelectionDirty = false;
  if (!changed) return;
  if (!setActiveThemeIds(draftIds, {notify: false})) return;
  notifyThemeDecksChanged("selection", {renderPicker: false});
}

function themeSelectMarkup(type) {
  const normalized = normalizeThemeType(type);
  if (!normalized) return "";
  const cacheKey = `${themeDataRevision}:${normalized}`;
  const cached = themeSelectMarkupCache.get(cacheKey);
  if (cached) return cached;

  const markup = ['<option value="">Choose...</option>'];
  activeThemeDeckRefs(normalized).forEach((deck) => {
    markup.push(`<optgroup label="${escapeThemeHtml(deck.title)}">`);
    deck.cards[normalized].forEach((card) => {
      const escapedCard = escapeThemeHtml(card);
      markup.push(
        `<option value="${escapedCard}" data-theme-id="${escapeThemeHtml(deck.id)}">${escapedCard}</option>`,
      );
    });
    markup.push("</optgroup>");
  });
  markup.push('<option value="__custom__">Custom...</option>');
  const result = markup.join("");
  themeSelectMarkupCache.set(cacheKey, result);
  return result;
}

function populateThemeSelect(selectId, type, options = {}) {
  const doc = themeDocument();
  const select = doc?.getElementById?.(selectId);
  const normalized = normalizeThemeType(type);
  if (!select || !normalized) return false;
  const oldValue = options.preserveValue === false ? "" : String(select.value || "");
  select.innerHTML = themeSelectMarkup(normalized);
  if (oldValue) select.value = oldValue;
  return true;
}

function blankThemeManagerDraft() {
  return {
    id: "",
    title: "",
    description: "",
    builtin: false,
    cards: {what: [], attribute: [], story: []},
  };
}

function managerCardRecords() {
  if (!themeManagerDraft) return [];
  const records = [];
  THEME_TYPES.forEach((type) => {
    themeManagerDraft.cards[type].forEach((text, index) => records.push({type, text, index}));
  });
  return records;
}

function updateThemeManagerCounts() {
  const doc = themeDocument();
  const node = doc?.getElementById?.("themeManagerCounts");
  if (!node || !themeManagerDraft) return;
  const counts = THEME_TYPES.map(
    (type) =>
      `${themeManagerDraft.cards[type].length} ${type === "attribute" ? "Attribute" : type[0].toUpperCase() + type.slice(1)}`,
  ).join(" · ");
  const low = THEME_TYPES.filter((type) => themeManagerDraft.cards[type].length < 10);
  node.textContent = low.length ? `${counts}. Add more cards for greater variety.` : counts;
}

function renderThemeManagerDeckSelect() {
  const doc = themeDocument();
  const select = doc?.getElementById?.("themeManagerDeckSelect");
  if (!select) return;
  select.innerHTML =
    `<option value="">Choose a custom theme...</option>` +
    customThemeDecks
      .map(
        (deck) =>
          `<option value="${escapeThemeHtml(deck.id)}">${escapeThemeHtml(deck.title)}</option>`,
      )
      .join("");
  select.value = themeManagerOriginalId || "";
}

function renderThemeManagerCards() {
  const doc = themeDocument();
  const list = doc?.getElementById?.("themeManagerCardList");
  if (!list || !themeManagerDraft) return;
  const query = String(doc.getElementById("themeManagerSearch")?.value || "")
    .trim()
    .toLowerCase();
  const filter = normalizeThemeType(doc.getElementById("themeManagerFilter")?.value) || "all";
  const records = managerCardRecords().filter((record) => {
    if (filter !== "all" && record.type !== filter) return false;
    return !query || record.text.toLowerCase().includes(query);
  });
  list.innerHTML = records.length
    ? records
        .map(
          (record) => `
    <div class="theme-card-row" data-theme-card-type="${record.type}" data-theme-card-index="${record.index}">
      <select class="theme-card-type" aria-label="Card type">
        <option value="what" ${record.type === "what" ? "selected" : ""}>What</option>
        <option value="attribute" ${record.type === "attribute" ? "selected" : ""}>Attribute</option>
        <option value="story" ${record.type === "story" ? "selected" : ""}>Story</option>
      </select>
      <input class="theme-card-text" maxlength="${THEME_LIMITS.maxCardLength}" value="${escapeThemeHtml(record.text)}" aria-label="Card text">
      <button class="theme-card-small-button app-button" data-theme-card-action="duplicate" type="button">Duplicate</button>
      <button class="theme-card-small-button app-button" data-theme-card-action="delete" type="button">Delete</button>
    </div>`,
        )
        .join("")
    : `<p class="theme-picker-empty">No cards match this view.</p>`;
  updateThemeManagerCounts();
}

function syncThemeManagerFields() {
  const doc = themeDocument();
  if (!doc || !themeManagerDraft) return;
  themeManagerDraft.title = String(doc.getElementById("themeManagerTitle")?.value || "");
  themeManagerDraft.description = String(
    doc.getElementById("themeManagerDescription")?.value || "",
  );
}

function setThemeManagerStatus(message = "", state = "") {
  const status = themeDocument()?.getElementById?.("themeManagerStatus");
  if (!status) return;
  status.textContent = message;
  if (state) status.dataset.state = state;
  else delete status.dataset.state;
}

function loadThemeManagerDraft(id = "") {
  const deck = customThemeDecks.find((entry) => entry.id === id);
  themeManagerOriginalId = deck?.id || null;
  themeManagerDraft = deck ? cloneThemeDeck(deck) : blankThemeManagerDraft();
  const doc = themeDocument();
  if (doc) {
    const title = doc.getElementById("themeManagerTitle");
    const description = doc.getElementById("themeManagerDescription");
    if (title) title.value = themeManagerDraft.title;
    if (description) description.value = themeManagerDraft.description;
    const search = doc.getElementById("themeManagerSearch");
    if (search) search.value = "";
    const filter = doc.getElementById("themeManagerFilter");
    if (filter) filter.value = "all";
  }
  renderThemeManagerDeckSelect();
  renderThemeManagerCards();
  setThemeManagerStatus(deck ? "Editing custom theme." : "Create a custom theme.");
  updateThemeManagerButtons();
}

function updateThemeManagerButtons() {
  const doc = themeDocument();
  if (!doc) return;
  const hasExisting = !!themeManagerOriginalId;
  ["duplicateThemeBtn", "exportThemeBtn", "deleteThemeBtn"].forEach((id) => {
    const button = doc.getElementById(id);
    if (button) button.disabled = !hasExisting;
  });
}

function openThemeManager(options = {}) {
  initializeThemeDeckUi();
  closeThemePicker();
  const id = options.newTheme === true ? "" : String(options.id || customThemeDecks[0]?.id || "");
  loadThemeManagerDraft(id);
  const modal = themeDocument()?.getElementById?.("themeManagerModal");
  modal?.classList.add("open");
  setTimeout(() => themeDocument()?.getElementById?.("themeManagerTitle")?.focus?.(), 0);
}

function closeThemeManager() {
  themeDocument()?.getElementById?.("themeManagerModal")?.classList.remove("open");
  themeManagerDraft = null;
  themeManagerOriginalId = null;
}

function addThemeManagerCard(type, text) {
  if (!themeManagerDraft) return false;
  const normalized = normalizeThemeType(type);
  const clean = cleanThemeText(text, THEME_LIMITS.maxCardLength);
  if (!normalized || !clean) {
    setThemeManagerStatus("Choose a type and enter card text.", "error");
    return false;
  }
  const total = THEME_TYPES.reduce(
    (sum, cardType) => sum + themeManagerDraft.cards[cardType].length,
    0,
  );
  if (total >= THEME_LIMITS.maxCardsPerTheme) {
    setThemeManagerStatus("This theme has reached its card limit.", "error");
    return false;
  }
  themeManagerDraft.cards[normalized].push(clean);
  renderThemeManagerCards();
  setThemeManagerStatus("Card added.");
  return true;
}

function addThemeManagerBulkCards() {
  const doc = themeDocument();
  const type = doc?.getElementById?.("themeBulkType")?.value;
  const textarea = doc?.getElementById?.("themeBulkCards");
  const lines = String(textarea?.value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) {
    setThemeManagerStatus("Enter one card per line.", "error");
    return;
  }
  let added = 0;
  lines.forEach((line) => {
    if (addThemeManagerCard(type, line)) added += 1;
  });
  if (textarea) textarea.value = "";
  renderThemeManagerCards();
  setThemeManagerStatus(`${added} ${added === 1 ? "card" : "cards"} added.`);
}

function validateThemeManagerDraft() {
  syncThemeManagerFields();
  const title = cleanThemeText(themeManagerDraft?.title, THEME_LIMITS.maxTitleLength);
  if (!title) return {ok: false, message: "Enter a theme name."};
  const duplicateTitle = [...BUILTIN_THEME_DECKS, ...customThemeDecks].some(
    (deck) =>
      deck.id !== themeManagerOriginalId && deck.title.trim().toLowerCase() === title.toLowerCase(),
  );
  if (duplicateTitle) return {ok: false, message: "Use a different theme name."};
  const cards = {what: [], attribute: [], story: []};
  const seen = new Set();
  for (const type of THEME_TYPES) {
    for (const raw of themeManagerDraft.cards[type]) {
      const text = cleanThemeText(raw, THEME_LIMITS.maxCardLength);
      if (!text) return {ok: false, message: "Remove empty cards before saving."};
      const key = `${type}:${text.toLowerCase()}`;
      if (seen.has(key)) return {ok: false, message: "Remove duplicate cards before saving."};
      seen.add(key);
      cards[type].push(text);
    }
  }
  return {
    ok: true,
    deck: {
      id: themeManagerOriginalId || createCustomThemeId(title),
      title,
      description: cleanThemeText(themeManagerDraft.description, THEME_LIMITS.maxDescriptionLength),
      builtin: false,
      cards,
    },
  };
}

function saveThemeManagerDraft() {
  if (!themeManagerDraft) return false;
  const validation = validateThemeManagerDraft();
  if (!validation.ok) {
    setThemeManagerStatus(validation.message, "error");
    return false;
  }
  const deck = validation.deck;
  const index = customThemeDecks.findIndex((entry) => entry.id === themeManagerOriginalId);
  if (index >= 0) customThemeDecks[index] = deck;
  else {
    if (customThemeDecks.length >= THEME_LIMITS.maxCustomThemes) {
      setThemeManagerStatus("Custom theme limit reached.", "error");
      return false;
    }
    customThemeDecks.push(deck);
  }
  themeManagerOriginalId = deck.id;
  themeManagerDraft = cloneThemeDeck(deck);
  if (!saveCustomThemeDecks()) {
    setThemeManagerStatus("Theme could not be saved.", "error");
    return false;
  }
  renderThemeManagerDeckSelect();
  updateThemeManagerButtons();
  const low = THEME_TYPES.filter((type) => deck.cards[type].length < 10);
  setThemeManagerStatus(
    low.length ? "Theme saved. Add more cards for greater variety." : "Theme saved.",
  );
  return true;
}

function uniqueCustomThemeCopyTitle(sourceTitle) {
  const base = `${sourceTitle} Copy`;
  const names = new Set(
    [...BUILTIN_THEME_DECKS, ...customThemeDecks].map((deck) => deck.title.toLowerCase()),
  );
  if (!names.has(base.toLowerCase())) return base;
  let number = 2;
  while (names.has(`${base} ${number}`.toLowerCase())) number += 1;
  return `${base} ${number}`;
}

function duplicateCurrentTheme() {
  const source = customThemeDecks.find((deck) => deck.id === themeManagerOriginalId);
  if (!source) return;
  if (customThemeDecks.length >= THEME_LIMITS.maxCustomThemes) {
    setThemeManagerStatus("Custom theme limit reached.", "error");
    return;
  }
  const copy = cloneThemeDeck(source);
  copy.id = createCustomThemeId(source.title);
  copy.title = uniqueCustomThemeCopyTitle(source.title);
  customThemeDecks.push(copy);
  if (saveCustomThemeDecks()) {
    loadThemeManagerDraft(copy.id);
    setThemeManagerStatus("Theme duplicated.");
  }
}

function exportCurrentTheme() {
  const source = customThemeDecks.find((deck) => deck.id === themeManagerOriginalId);
  if (!source) return;
  const payload = {
    format: THEME_EXPORT_FORMAT,
    version: THEME_EXPORT_VERSION,
    theme: cloneThemeDeck(source),
  };
  try {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const anchor = themeDocument().createElement("a");
    anchor.href = url;
    anchor.download = `${themeSlug(source.title)}.wormholes-theme.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    setThemeManagerStatus("Theme exported.");
  } catch (error) {
    setThemeManagerStatus("Theme could not be exported.", "error");
  }
}

function parseImportedThemePayload(payload) {
  if (!payload || typeof payload !== "object") return [];
  if (payload.format === THEME_EXPORT_FORMAT && payload.theme) return [payload.theme];
  if (Array.isArray(payload.themes)) return payload.themes;
  if (payload.title || payload.name) return [payload];
  return [];
}

async function importThemeFile(file) {
  if (!file) return;
  if (Number(file.size || 0) > THEME_LIMITS.maxImportBytes) {
    setThemeManagerStatus("That theme file is too large.", "error");
    return;
  }
  try {
    const payload = JSON.parse(await file.text());
    const rawThemes = parseImportedThemePayload(payload);
    if (!rawThemes.length) throw new Error("No theme found");
    let imported = 0;
    let lastId = "";
    for (const raw of rawThemes) {
      if (customThemeDecks.length >= THEME_LIMITS.maxCustomThemes) break;
      const deck = normalizeCustomThemeDeck(raw, {newId: true});
      if (!deck) continue;
      deck.title = uniqueCustomThemeCopyTitle(deck.title).replace(/ Copy$/, "");
      if (
        [...BUILTIN_THEME_DECKS, ...customThemeDecks].some(
          (entry) => entry.title.toLowerCase() === deck.title.toLowerCase(),
        )
      )
        deck.title = uniqueCustomThemeCopyTitle(deck.title);
      customThemeDecks.push(deck);
      imported += 1;
      lastId = deck.id;
    }
    if (!imported || !saveCustomThemeDecks()) throw new Error("Import failed");
    loadThemeManagerDraft(lastId);
    setThemeManagerStatus(`${imported} ${imported === 1 ? "theme" : "themes"} imported.`);
  } catch (error) {
    setThemeManagerStatus("Theme file could not be imported.", "error");
  }
}

function openThemeDeleteConfirmation() {
  if (!themeManagerOriginalId) return;
  const deck = customThemeDecks.find((entry) => entry.id === themeManagerOriginalId);
  if (!deck) return;
  pendingThemeDeleteId = deck.id;
  const text = themeDocument()?.getElementById?.("themeDeleteConfirmText");
  if (text) text.textContent = `Delete “${deck.title}”? This cannot be undone.`;
  themeDocument()?.getElementById?.("themeDeleteConfirmModal")?.classList.add("open");
  setTimeout(() => themeDocument()?.getElementById?.("cancelThemeDeleteBtn")?.focus?.(), 0);
}

function closeThemeDeleteConfirmation() {
  themeDocument()?.getElementById?.("themeDeleteConfirmModal")?.classList.remove("open");
  pendingThemeDeleteId = null;
}

function confirmThemeDelete() {
  const id = pendingThemeDeleteId;
  if (!id) return;
  const deck = customThemeDecks.find((entry) => entry.id === id);
  customThemeDecks = customThemeDecks.filter((entry) => entry.id !== id);
  selectedThemeIds = selectedThemeIds.filter((entry) => entry !== id);
  if (!selectedThemeIds.length) selectedThemeIds = [BUILTIN_THEME_DECKS[0].id];
  const saved = saveCustomThemeDecks() && saveSelectedThemeIds();
  closeThemeDeleteConfirmation();
  loadThemeManagerDraft(customThemeDecks[0]?.id || "");
  setThemeManagerStatus(
    saved ? "Theme deleted." : "Theme could not be deleted.",
    saved ? "" : "error",
  );
  if (deck) showThemeToast("Custom theme deleted");
}

function handleThemeManagerCardListInput(event) {
  const row = event.target?.closest?.("[data-theme-card-type][data-theme-card-index]");
  if (!row || !themeManagerDraft) return;
  const originalType = normalizeThemeType(row.dataset.themeCardType);
  const originalIndex = Number(row.dataset.themeCardIndex);
  if (!originalType || !Number.isInteger(originalIndex)) return;
  const textInput = row.querySelector(".theme-card-text");
  const typeSelect = row.querySelector(".theme-card-type");
  if (event.target === textInput) {
    themeManagerDraft.cards[originalType][originalIndex] = textInput.value;
    updateThemeManagerCounts();
  } else if (event.target === typeSelect) {
    const nextType = normalizeThemeType(typeSelect.value);
    if (!nextType || nextType === originalType) return;
    const [text] = themeManagerDraft.cards[originalType].splice(originalIndex, 1);
    themeManagerDraft.cards[nextType].push(text);
    renderThemeManagerCards();
  }
}

function handleThemeManagerCardListClick(event) {
  const button = event.target?.closest?.("[data-theme-card-action]");
  const row = button?.closest?.("[data-theme-card-type][data-theme-card-index]");
  if (!button || !row || !themeManagerDraft) return;
  const type = normalizeThemeType(row.dataset.themeCardType);
  const index = Number(row.dataset.themeCardIndex);
  if (!type || !Number.isInteger(index)) return;
  if (button.dataset.themeCardAction === "delete") {
    themeManagerDraft.cards[type].splice(index, 1);
    renderThemeManagerCards();
    setThemeManagerStatus("Card deleted.");
  } else if (button.dataset.themeCardAction === "duplicate") {
    const text = themeManagerDraft.cards[type][index];
    themeManagerDraft.cards[type].splice(index + 1, 0, text);
    renderThemeManagerCards();
    setThemeManagerStatus("Card duplicated.");
  }
}

function installThemeDeckUiListeners() {
  const doc = themeDocument();
  if (!doc || themeUiInstalled) return;
  themeUiInstalled = true;

  doc.addEventListener("click", (event) => {
    const remove = event.target?.closest?.("[data-theme-remove]");
    if (remove) {
      removeActiveTheme(remove.dataset.themeRemove);
      return;
    }
    const open = event.target?.closest?.("[data-open-theme-picker]");
    if (open) {
      openThemePicker(open);
      return;
    }
  });

  doc.getElementById("themePickerList")?.addEventListener("change", (event) => {
    const checkbox = event.target?.closest?.("[data-theme-picker-id]");
    if (!checkbox) return;
    if (!stageThemePickerSelection(checkbox.dataset.themePickerId, checkbox.checked)) {
      checkbox.checked = !checkbox.checked;
    }
  });
  doc.getElementById("closeThemePickerBtn")?.addEventListener("click", closeThemePicker);
  doc
    .getElementById("addCustomThemeBtn")
    ?.addEventListener("click", () => openThemeManager({newTheme: true}));
  doc.getElementById("manageCustomThemesBtn")?.addEventListener("click", () => openThemeManager());

  doc.getElementById("closeThemeManagerBtn")?.addEventListener("click", closeThemeManager);
  doc
    .getElementById("newCustomThemeBtn")
    ?.addEventListener("click", () => loadThemeManagerDraft(""));
  doc
    .getElementById("themeManagerDeckSelect")
    ?.addEventListener("change", (event) => loadThemeManagerDraft(event.target.value));
  doc.getElementById("themeManagerSearch")?.addEventListener("input", renderThemeManagerCards);
  doc.getElementById("themeManagerFilter")?.addEventListener("change", renderThemeManagerCards);
  doc.getElementById("themeManagerTitle")?.addEventListener("input", syncThemeManagerFields);
  doc.getElementById("themeManagerDescription")?.addEventListener("input", syncThemeManagerFields);
  doc.getElementById("addThemeCardBtn")?.addEventListener("click", () => {
    const type = doc.getElementById("newThemeCardType")?.value;
    const input = doc.getElementById("newThemeCardText");
    if (addThemeManagerCard(type, input?.value)) {
      if (input) input.value = "";
      input?.focus?.();
    }
  });
  doc.getElementById("newThemeCardText")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      doc.getElementById("addThemeCardBtn")?.click?.();
    }
  });
  doc.getElementById("addThemeBulkBtn")?.addEventListener("click", addThemeManagerBulkCards);
  doc
    .getElementById("themeManagerCardList")
    ?.addEventListener("input", handleThemeManagerCardListInput);
  doc
    .getElementById("themeManagerCardList")
    ?.addEventListener("change", handleThemeManagerCardListInput);
  doc
    .getElementById("themeManagerCardList")
    ?.addEventListener("click", handleThemeManagerCardListClick);
  doc.getElementById("saveThemeBtn")?.addEventListener("click", saveThemeManagerDraft);
  doc.getElementById("duplicateThemeBtn")?.addEventListener("click", duplicateCurrentTheme);
  doc.getElementById("exportThemeBtn")?.addEventListener("click", exportCurrentTheme);
  doc.getElementById("deleteThemeBtn")?.addEventListener("click", openThemeDeleteConfirmation);
  doc
    .getElementById("importThemeBtn")
    ?.addEventListener("click", () => doc.getElementById("themeImportInput")?.click?.());
  doc.getElementById("themeImportInput")?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    await importThemeFile(file);
    event.target.value = "";
  });
  doc
    .getElementById("cancelThemeDeleteBtn")
    ?.addEventListener("click", closeThemeDeleteConfirmation);
  doc.getElementById("confirmThemeDeleteBtn")?.addEventListener("click", confirmThemeDelete);
}

function initializeThemeDeckUi() {
  loadThemeDeckState();
  installThemeDeckUiListeners();
  renderThemeChips();
  return true;
}

function themeDeckDiagnostics() {
  loadThemeDeckState();
  return Object.freeze({
    builtInDecks: BUILTIN_THEME_DECKS.length,
    customDecks: customThemeDecks.length,
    activeDecks: selectedThemeIds.length,
    activeThemeIds: Object.freeze([...selectedThemeIds]),
    builtInCardCount: THEME_TYPES.reduce((sum, type) => sum + allBuiltInThemeCards(type).length, 0),
  });
}

function installThemeDeckSystem(target = themeWindow()) {
  const api = Object.freeze({
    builtInDecks: BUILTIN_THEME_DECKS,
    limits: THEME_LIMITS,
    load: loadThemeDeckState,
    initializeUi: initializeThemeDeckUi,
    allDecks: allThemeDecks,
    activeDecks: activeThemeDecks,
    activeIds: activeThemeIds,
    deckById: themeDeckById,
    allBuiltInCards: allBuiltInThemeCards,
    activeCards: activeThemeCards,
    chooseCard: chooseThemeCard,
    hasCards: themeSelectionHasCards,
    setActiveIds: setActiveThemeIds,
    toggleActive: toggleActiveTheme,
    removeActive: removeActiveTheme,
    populateSelect: populateThemeSelect,
    openPicker: openThemePicker,
    closePicker: closeThemePicker,
    openManager: openThemeManager,
    closeManager: closeThemeManager,
    diagnostics: themeDeckDiagnostics,
    normalizeCustomDeck: normalizeCustomThemeDeck,
    exportState: exportThemeDeckState,
    prepareImportedState: prepareImportedThemeDeckState,
    writePreparedCustomDecks: writePreparedCustomThemeDecks,
    writePreparedSelection: writePreparedThemeSelection,
    applyPreparedState: applyPreparedThemeDeckState,
    storageKeys: Object.freeze({
      customDecks: THEME_CUSTOM_STORAGE_KEY,
      selectedThemeIds: THEME_SELECTION_STORAGE_KEY,
    }),
  });
  target.WormholesThemeDecks = api;
  return api;
}

const themeDeckApi = installThemeDeckSystem(themeWindow());

export {
  BUILTIN_THEME_DECKS,
  THEME_LIMITS,
  normalizeThemeType,
  normalizeCustomThemeDeck,
  exportThemeDeckState,
  prepareImportedThemeDeckState,
  writePreparedCustomThemeDecks,
  writePreparedThemeSelection,
  applyPreparedThemeDeckState,
  loadThemeDeckState,
  allThemeDecks,
  activeThemeDecks,
  activeThemeIds,
  allBuiltInThemeCards,
  activeThemeCards,
  chooseThemeCard,
  themeSelectionHasCards,
  setActiveThemeIds,
  toggleActiveTheme,
  removeActiveTheme,
  populateThemeSelect,
  initializeThemeDeckUi,
  openThemePicker,
  closeThemePicker,
  openThemeManager,
  closeThemeManager,
  themeDeckDiagnostics,
  installThemeDeckSystem,
};

export default themeDeckApi;
