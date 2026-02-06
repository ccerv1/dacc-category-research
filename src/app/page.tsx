import MarketMap from "@/components/MarketMap";

export default function Home() {
  return (
    <div>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 24px",
          borderBottom: "1px solid #eee",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            fontFamily: "system-ui, -apple-system, sans-serif",
            color: "#333",
          }}
        >
          d/acc Market Map
        </h1>
        <a
          href="https://github.com/ccerv1/dacc-category-research"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 13,
            fontFamily: "system-ui, -apple-system, sans-serif",
            color: "#666",
            textDecoration: "none",
            border: "1px solid #ddd",
            borderRadius: 6,
            padding: "4px 12px",
          }}
        >
          Got a d/acc project? Submit a PR &rarr;
        </a>
      </header>
      <MarketMap />
    </div>
  );
}
