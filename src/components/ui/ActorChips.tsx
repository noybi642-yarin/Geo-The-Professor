export default function ActorChips({ actors }: { actors: string[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
      {actors.map((actor) => (
        <span
          key={actor}
          style={{
            fontSize: "12px",
            color: "var(--text-2)",
            background: "var(--bg-3)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "12px",
            padding: "3px 10px",
          }}
        >
          {actor}
        </span>
      ))}
    </div>
  );
}
