import { useRef, useState, type KeyboardEvent } from "react";
import Link from "@docusaurus/Link";
import Head from "@docusaurus/Head";
import Layout from "@theme/Layout";
import CodeBlock from "@theme/CodeBlock";
import releases from "../../releases.json";
import styles from "./index.module.css";

const release = releases.releases.find(
  (item) => item.contract === releases.stable,
)!;
const docs = `/docs/${release.contract}`;
const github = "https://github.com/auto-agent-protocol/auto-agent-protocol";
const icons = {
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  agent: (
    <>
      <rect x="4" y="6" width="16" height="14" rx="4" />
      <path d="M12 2v4M8 11h.01M16 11h.01M8 16h8M1 11v4M23 11v4" />
    </>
  ),
  dealer: (
    <path d="M3 10h18v11H3zM2 10l3-7h14l3 7M8 21v-7h8v7M7 3l-1 7M17 3l1 7" />
  ),
  search: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="m15 15 7 7" />
    </>
  ),
  filter: (
    <>
      <path d="M3 5h18M6 12h12M10 19h4" />
      <circle cx="8" cy="5" r="2" />
      <circle cx="16" cy="12" r="2" />
    </>
  ),
  car: (
    <path d="m3 11 3-7h12l3 7v8H3zM3 11h18M7 4l-1 7M17 4l1 7M6 15h2M16 15h2M6 19v3M18 19v3" />
  ),
  lead: (
    <>
      <rect x="2" y="5" width="20" height="15" rx="3" />
      <path d="m3 7 9 7 9-7" />
    </>
  ),
  shield: <path d="M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6zM7 12l3 3 7-7" />,
  tools: (
    <path d="M14 3a6 6 0 0 0-7 8L2 18a3 3 0 0 0 4 4l7-6a6 6 0 0 0 8-7l-5 3-4-4z" />
  ),
  key: (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="m12 12 10 10M17 17l3-3M20 20l3-3" />
    </>
  ),
  check: <path d="m5 12 4 4L20 5" />,
  copy: (
    <>
      <rect x="8" y="8" width="13" height="13" rx="2" />
      <path d="M16 8V3H3v13h5" />
    </>
  ),
  motorcycle: (
    <>
      <circle cx="5" cy="17" r="4" />
      <circle cx="19" cy="17" r="4" />
      <path d="m5 17 5-8h7l2 8M11 17H5M10 9l3 8h6M17 9l-2-6h-3M7 7h5" />
    </>
  ),
  bolt: <path d="m13 2-9 12h7l-1 8 10-13h-7z" />,
} as const;
type IconName = keyof typeof icons;
function Icon({
  name,
  className,
}: {
  name: IconName;
  className?: string;
}): JSX.Element {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[name]}
    </svg>
  );
}
function TextLink({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <Link className={styles.textLink} to={to}>
      {children}
      <Icon name="arrow" />
    </Link>
  );
}
function HeroMap(): JSX.Element {
  return (
    <div
      className={styles.heroMap}
      aria-label="Buyer agents use MCP, A2A or PAP to reach the AAP automotive contract and dealer inventory and CRM"
    >
      <div className={styles.mapTop}>
        <Icon name="agent" />
        <span>YOUR BUYER AGENT</span>
        <span className={styles.mapStatus}>Connected by a shared contract</span>
      </div>
      <div className={styles.mapProtocols}>
        {(
          [
            ["tools", "MCP"],
            ["agent", "A2A"],
            ["key", "PAP"],
          ] as [IconName, string][]
        ).map(([icon, title]) => (
          <div key={title}>
            <Icon name={icon} />
            <strong>{title}</strong>
          </div>
        ))}
      </div>
      <div className={styles.mapConnections} aria-hidden="true">
        <svg viewBox="0 0 480 76" preserveAspectRatio="none">
          <path d="M80 0V18Q80 38 100 38H220Q240 38 240 60V76M240 0V76M400 0V18Q400 38 380 38H260Q240 38 240 60" />
        </svg>
      </div>
      <div className={styles.mapCore}>
        <img
          src="/img/brand/aap-symbol.png"
          srcSet="/img/brand/aap-symbol-76.png 1x, /img/brand/aap-symbol-152.png 2x, /img/brand/aap-symbol-228.png 3x"
          width="76"
          height="76"
          alt=""
        />
        <div>
          <span>THE AUTOMOTIVE LAYER</span>
          <strong>Auto Agent Protocol</strong>
          <p>Same skills. Same facts. Same consent.</p>
        </div>
      </div>
      <div className={styles.mapDown} aria-hidden="true" />
      <div className={styles.mapDealer}>
        <Icon name="dealer" />
        <div>
          <strong>The dealership</strong>
          <span>
            Live inventory <i /> Vehicle evidence <i /> CRM
          </span>
        </div>
        <Icon name="check" />
      </div>
      <div className={styles.mapFooter}>
        <span>DEALER-DOMAIN DISCOVERY</span>
        <code>agent-card.json · poppy.json · llms.txt</code>
      </div>
    </div>
  );
}
function Hero(): JSX.Element {
  return (
    <header className={styles.hero}>
      <div className={styles.shell}>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <Link className={styles.releaseBadge} to={`${docs}/versioning`}>
              <span />
              AAP {release.version}
              <Icon name="arrow" />
            </Link>
            <h1>
              Automotive. <br />
              Built for <br />
              <em>AI agents.</em>
            </h1>
            <p className={styles.heroDescription}>
              The open automotive contract for MCP, A2A and PAP. Discover
              dealerships, search real inventory and connect with consent.
            </p>
            <div className={styles.actions}>
              <Link className={styles.primaryButton} to={`${docs}/intro`}>
                Explore the specification
                <Icon name="arrow" />
              </Link>
              <Link className={styles.secondaryButton} to={github}>
                View on GitHub
              </Link>
            </div>
            <p className={styles.heroNote}>
              Open source <span>·</span> Five automotive skills <span>·</span>{" "}
              Three native interfaces
            </p>
          </div>
          <HeroMap />
        </div>
      </div>
    </header>
  );
}

const searchRequest = {
  type: "inventory.search.request",
  filters: { body: ["suv"], price_max: 35000, status: ["available"] },
  pagination: { limit: 20 },
  sort: { field: "price", order: "asc" },
  privacy: { anonymous: true },
};
const protocols = [
  {
    name: "MCP",
    icon: "tools" as const,
    subtitle: "Native tools",
    title: "Tools your agent can discover and call.",
    description:
      "Model Context Protocol tools with complete schemas and structured automotive results. Current and legacy clients.",
    path: "bindings/mcp",
    steps: [
      "Discover tools",
      "Call aap_inventory_search",
      "Read structuredContent",
    ],
    codeTitle: "MCP tools/call parameters · request metadata omitted",
    code: { name: "aap_inventory_search", arguments: searchRequest },
  },
  {
    name: "A2A",
    icon: "agent" as const,
    subtitle: "Typed messages",
    title: "Automotive data inside a standard agent message.",
    description:
      "Agent2Agent 1.0 SendMessage with a required AAP extension and typed DataParts. One operation for every skill.",
    path: "bindings/json-rpc",
    steps: [
      "Read the Agent Card",
      "Activate the AAP extension",
      "SendMessage + DataPart",
    ],
    codeTitle: "A2A request Message · HTTP and JSON-RPC envelope omitted",
    code: {
      messageId: "example-search-1",
      role: "ROLE_USER",
      parts: [
        {
          data: searchRequest,
          mediaType: "application/vnd.autoagent.inventory-search-request+json",
        },
      ],
    },
  },
  {
    name: "PAP",
    icon: "key" as const,
    subtitle: "Personal agents",
    title: "A native API for a verified personal agent.",
    description:
      "Personal Agent Protocol draft 0.3 discovery, guest Sessions and DPoP. Automotive skills without a shopper account.",
    path: "personal-agent-protocol",
    steps: [
      "Read poppy.json",
      "Verify issuer + start Session",
      "Call the native OpenAPI",
    ],
    codeTitle:
      "PAP inventory search JSON body · token and DPoP headers omitted",
    code: searchRequest,
  },
];
function ProtocolExplorer(): JSX.Element {
  const [selected, setSelected] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  function selectWithKeyboard(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ): void {
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % protocols.length
        : event.key === "ArrowLeft"
          ? (index + protocols.length - 1) % protocols.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? protocols.length - 1
              : null;
    if (next === null) return;
    event.preventDefault();
    setSelected(next);
    refs.current[next]?.focus();
  }
  const active = protocols[selected];
  return (
    <section className={styles.section} id="interfaces">
      <div className={styles.shell}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>
            ONE CONTRACT. THREE NATIVE INTERFACES.
          </p>
          <h2>
            Meet agents where
            <br />
            they already work.
          </h2>
          <p>Choose an interface. Keep the automotive meaning.</p>
        </div>
        <div
          className={styles.protocolTabs}
          role="tablist"
          aria-label="Explore AAP interfaces"
        >
          {protocols.map((protocol, index) => (
            <button
              key={protocol.name}
              ref={(node) => {
                refs.current[index] = node;
              }}
              id={`protocol-tab-${index}`}
              role="tab"
              aria-selected={selected === index}
              aria-controls={`protocol-panel-${index}`}
              tabIndex={selected === index ? 0 : -1}
              onClick={() => setSelected(index)}
              onKeyDown={(event) => selectWithKeyboard(event, index)}
            >
              <Icon name={protocol.icon} />
              <span>
                <strong>{protocol.name}</strong>
                <small>{protocol.subtitle}</small>
              </span>
              <span className={styles.tabIndicator} aria-hidden="true" />
            </button>
          ))}
        </div>
        <div
          className={styles.protocolPanel}
          id={`protocol-panel-${selected}`}
          role="tabpanel"
          aria-labelledby={`protocol-tab-${selected}`}
          tabIndex={0}
        >
          <div className={styles.protocolIntro}>
            <div>
              <h3>{active.title}</h3>
              <p>{active.description}</p>
            </div>
            <TextLink to={`${docs}/${active.path}`}>
              Read the {active.name} binding
            </TextLink>
          </div>
          <ol className={styles.protocolSteps}>
            {active.steps.map((step, index) => (
              <li key={step}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{step}</strong>
                {index < 2 && <Icon name="arrow" />}
              </li>
            ))}
          </ol>
          <details className={styles.codeDetails} key={active.name}>
            <summary>
              See the request shape <code>inventory.search</code>
            </summary>
            <p>{active.codeTitle}</p>
            <CodeBlock language="json">
              {JSON.stringify(active.code, null, 2)}
            </CodeBlock>
            <TextLink to={`${docs}/${active.path}`}>
              Complete headers and exchange
            </TextLink>
          </details>
        </div>
      </div>
    </section>
  );
}
const skills: [IconName, string, string, string][] = [
  [
    "dealer",
    "Know the dealer",
    "dealer.information",
    "Locations, hours and services",
  ],
  [
    "filter",
    "Learn the inventory",
    "inventory.facets",
    "Values, ranges and feature codes",
  ],
  [
    "search",
    "Find a match",
    "inventory.search",
    "Constraints, distance and pages",
  ],
  [
    "car",
    "Verify the vehicle",
    "inventory.vehicle",
    "Current facts and source evidence",
  ],
  [
    "lead",
    "Connect with consent",
    "lead.submit",
    "One approved, idempotent inquiry",
  ],
];
function Skills(): JSX.Element {
  return (
    <section className={`${styles.section} ${styles.tinted}`}>
      <div className={styles.shell}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>THE AUTOMOTIVE JOURNEY</p>
          <h2>Five skills. A complete handoff.</h2>
          <p>
            From a dealership’s first discovery to a customer-approved inquiry.
          </p>
        </div>
        <div className={styles.skills}>
          {skills.map(([icon, title, id, description], index) => (
            <Link
              key={id}
              to={`${docs}/skills/${id.replaceAll(".", "-")}`}
              className={styles.skill}
            >
              <span className={styles.skillNumber}>0{index + 1}</span>
              <Icon name={icon} />
              <h3>{title}</h3>
              <code>{id}</code>
              <p>{description}</p>
              <Icon name="arrow" className={styles.skillArrow} />
            </Link>
          ))}
        </div>
        <div className={styles.consentLine}>
          <span>Read without shopper contact details</span>
          <span>
            <Icon name="shield" />
            Explicit consent for contact
          </span>
        </div>
      </div>
    </section>
  );
}
function VehicleArt(): JSX.Element {
  return (
    <svg
      viewBox="0 0 560 210"
      className={styles.vehicleArt}
      role="img"
      aria-label="Illustration of an SUV"
    >
      <ellipse
        cx="282"
        cy="177"
        rx="211"
        ry="13"
        fill="currentColor"
        opacity=".08"
      />
      <path
        d="M64 126 108 111 151 65Q157 58 175 58H337Q352 58 366 70L420 114 480 129Q494 132 497 148V167H62V146Q62 132 64 126Z"
        fill="#2874d7"
      />
      <path
        d="m126 112 38-40h81v40Zm133-40h77q10 0 18 8l37 32H259Z"
        fill="#dceaff"
      />
      <path
        d="M245 65v55M398 120l-10 43M127 120l-12 43M66 144h429"
        fill="none"
        stroke="#1754a4"
        strokeWidth="3"
      />
      <path d="M73 128h28l-5 13H69M462 133h20l4 10h-24" fill="#eff5ff" />
      <path
        d="M264 126h23M182 126h23"
        stroke="#dceaff"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {[150, 405].map((x) => (
        <g key={x}>
          <circle cx={x} cy="163" r="36" fill="#12213a" />
          <circle cx={x} cy="163" r="22" fill="#d8e1ed" />
          <circle cx={x} cy="163" r="10" fill="#52627a" />
        </g>
      ))}
    </svg>
  );
}
function VehicleFacts(): JSX.Element {
  return (
    <section className={styles.section}>
      <div className={`${styles.shell} ${styles.factsGrid}`}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>FACTS AN AGENT CAN USE</p>
          <h2>
            Less guessing.
            <br />
            More evidence.
          </h2>
          <p>
            Go beyond a listing title. Search supported constraints and explain
            why a vehicle matches.
          </p>
          <ul className={styles.factList}>
            <li>
              <Icon name="check" />
              <span>Equipment backed by a source</span>
            </li>
            <li>
              <Icon name="check" />
              <span>Price includes mandatory dealer charges</span>
            </li>
            <li>
              <Icon name="check" />
              <span>Explicit availability and update time</span>
            </li>
            <li>
              <Icon name="check" />
              <span>Distance and complete cursor pagination</span>
            </li>
          </ul>
          <TextLink to={`${docs}/skills/inventory-search`}>
            Explore the search contract
          </TextLink>
        </div>
        <div className={styles.vehicleCard}>
          <div className={styles.vehicleTop}>
            <span>ILLUSTRATIVE LISTING</span>
            <span className={styles.available}>
              <i />
              Available
            </span>
          </div>
          <VehicleArt />
          <div className={styles.vehicleIdentity}>
            <div>
              <span>2024 · USED SUV</span>
              <h3>Example Tourer</h3>
            </div>
            <strong>
              $32,995<small>Mandatory dealer fees included</small>
            </strong>
          </div>
          <div className={styles.evidence}>
            <div>
              <Icon name="shield" />
              <strong>Heated front seats</strong>
              <span>Present</span>
            </div>
            <p>
              “Heated front seats”<span>Source: vehicle window sticker</span>
            </p>
            <code>feature_evidence[0].status: "present"</code>
          </div>
          <div className={styles.vehicleMeta}>
            <span>
              <strong>18.400 mi</strong>To selling rooftop
            </span>
            <span>
              <strong>Source timestamp</strong>2026-10-24 10:00 UTC
            </span>
          </div>
          <p className={styles.exampleNote}>
            Fictional data illustrating the contract. No live inventory query.
          </p>
        </div>
      </div>
    </section>
  );
}
function Discovery(): JSX.Element {
  return (
    <section className={`${styles.section} ${styles.tinted}`}>
      <div className={styles.shell}>
        <div className={styles.discoveryHeading}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>
              DISCOVERABLE ON THE DEALER’S DOMAIN
            </p>
            <h2>
              The website becomes
              <br />
              an agent entry point.
            </h2>
          </div>
          <div>
            <p>
              Publish the exact MCP endpoint alongside the Agent Card, Poppy
              discovery and a concise <code>llms.txt</code>. Keep every link
              aligned with the working service.
            </p>
            <TextLink to={`${docs}/discovery`}>
              See the discovery contract
            </TextLink>
          </div>
        </div>
        <div className={styles.discoveryVisual}>
          <a
            href={`/docs/${release.contract}/img/discovery-flow.svg`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src={`/docs/${release.contract}/img/discovery-flow.svg`}
              width="1200"
              height="760"
              loading="lazy"
              alt="The dealership website publishes agent-card.json, poppy.json and llms.txt linking the same MCP, A2A and PAP endpoints"
            />
            <span>Open full-size diagram ↗</span>
          </a>
        </div>
        <div className={styles.discoveryNote}>
          <Icon name="filter" />
          <p>
            Discovery makes capabilities readable. Each agent still chooses
            which supported interface to use.
          </p>
          <a href={`/${release.contract}/examples/llms.txt.example.md`}>
            Dealer llms.txt example ↗
          </a>
        </div>
      </div>
    </section>
  );
}
function VehicleScope(): JSX.Element {
  return (
    <section className={styles.scope}>
      <div className={styles.shell}>
        <div>
          <p className={styles.eyebrow}>BUILT FOR THE VERTICAL</p>
          <h2>
            Automotive detail,
            <br />
            shared across vehicle types.
          </h2>
        </div>
        <div className={styles.scopeItems}>
          {(
            [
              ["car", "Cars", "Body, drivetrain and mileage"],
              ["motorcycle", "Motorcycles", "Segment and engine displacement"],
              ["bolt", "Electric powertrains", "Range, battery and charging"],
            ] as [IconName, string, string][]
          ).map(([icon, title, detail]) => (
            <div key={title}>
              <Icon name={icon} />
              <h3>{title}</h3>
              <p>{detail}</p>
            </div>
          ))}
        </div>
        <TextLink to={`${docs}/skills/inventory-vehicle`}>
          Read the vehicle contract
        </TextLink>
      </div>
    </section>
  );
}
function GetStarted(): JSX.Element {
  const command = `npm install @autoagentprotocol/schemas@${release.version} @autoagentprotocol/types@${release.version} @autoagentprotocol/validator@${release.version}`;
  const [copyStatus, setCopyStatus] = useState("");
  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(command);
      setCopyStatus("Copied");
    } catch {
      setCopyStatus("Select the command to copy");
    }
  }
  return (
    <section className={styles.getStarted}>
      <div className={styles.shell}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>
            OPEN SPECIFICATION. PRACTICAL BUILDING BLOCKS.
          </p>
          <h2>
            Build the next
            <br />
            automotive connection.
          </h2>
        </div>
        <div className={styles.startLinks}>
          <Link to={`${docs}/discovery`}>
            <Icon name="dealer" />
            <strong>Expose a dealership</strong>
            <span>Discovery, bindings and live capabilities</span>
            <Icon name="arrow" />
          </Link>
          <Link to={`${docs}/bindings/mcp`}>
            <Icon name="agent" />
            <strong>Connect a buyer agent</strong>
            <span>Choose a binding and validate the contract</span>
            <Icon name="arrow" />
          </Link>
          <Link to={`${docs}/conformance`}>
            <Icon name="shield" />
            <strong>Verify an implementation</strong>
            <span>Shared schemas and runtime acceptance</span>
            <Icon name="arrow" />
          </Link>
        </div>
        <div className={styles.install}>
          <div>
            <span>SCHEMAS · TYPES · VALIDATION</span>
            <button onClick={copy} aria-label="Copy npm install command">
              <Icon name="copy" />
              <span aria-live="polite">{copyStatus || "Copy"}</span>
            </button>
          </div>
          <code>{command}</code>
        </div>
        <div className={styles.startBottom}>
          <span>
            Apache-2.0 specification and schemas · CC BY 4.0 documentation
          </span>
          <TextLink to={github}>Contribute on GitHub</TextLink>
        </div>
      </div>
    </section>
  );
}
const structuredData = {
  "@context": "https://schema.org",
  "@type": "APIReference",
  "@id": "https://autoagentprotocol.org/#spec",
  name: `Auto Agent Protocol ${release.version}`,
  headline: "Automotive skills through MCP, A2A and PAP",
  url: `https://autoagentprotocol.org${docs}/intro`,
  version: release.version,
  description:
    "An open automotive contract for dealer-domain discovery, evidence-based inventory search, transparent pricing and consented leads through MCP, A2A and PAP.",
  isBasedOn: [
    "https://modelcontextprotocol.io/specification/2026-07-28",
    "https://a2a-protocol.org/v1.0.0/specification/",
    "https://personalagentprotocol.org/docs/0.3/spec",
  ],
  isPartOf: { "@id": "https://autoagentprotocol.org/#website" },
  publisher: { "@id": "https://autoagentprotocol.org/#organization" },
  image: "https://autoagentprotocol.org/img/brand/aap-social-card.png",
  license: "https://www.apache.org/licenses/LICENSE-2.0",
};
export default function Home(): JSX.Element {
  return (
    <Layout
      title="Automotive. Built for AI agents."
      description="Auto Agent Protocol connects AI agents to dealerships through native MCP, A2A and PAP. One open contract for discovery, inventory, pricing, evidence and consent."
    >
      <Head>
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Head>
      <Hero />
      <main>
        <ProtocolExplorer />
        <Skills />
        <VehicleFacts />
        <Discovery />
        <VehicleScope />
        <GetStarted />
      </main>
    </Layout>
  );
}
