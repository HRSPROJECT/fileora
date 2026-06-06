export default function HowItWorks({ steps }) {
  const items = steps || [
    ['Drop your file', 'Choose a file from your device or drag it into the workspace.'],
    ['We process it instantly in your browser', 'Fileora uses local browser APIs, never server uploads.'],
    ['Download the result', 'Save the finished file immediately, ready to share or publish.'],
  ]

  return (
    <section className="section container">
      <div className="section-heading">
        <p className="eyebrow">How it works</p>
        <h2>{items.length} steps, zero waiting rooms</h2>
      </div>
      <div className="steps-grid">
        {items.map(([title, body], index) => (
          <article className="step-card" key={title}>
            <span>{index + 1}</span>
            <h3>{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
