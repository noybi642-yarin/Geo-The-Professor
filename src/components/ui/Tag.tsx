export default function Tag({ label, type }: { label: string; type: string }) {
  return (
    <span
      className={`tag-${type}`}
      style={{
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.06em",
        padding: "3px 8px",
        borderRadius: "4px",
        border: "1px solid",
        display: "inline-block",
        textTransform: "uppercase",
      }}
    >
      {label}
    </span>
  );
}
