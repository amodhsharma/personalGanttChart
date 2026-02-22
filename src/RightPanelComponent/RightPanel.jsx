import "./RightPanel.css";
import GoToComponent from "../goToComponent/GoToComponent";

export default function RightPanel({
  timelineViewOptions,
  timelineViewKey,
  onSelectTimelineView,
  goToControls,
  timelineCanvasRef,
  timelineContainerRef
}) {
  return (
    <main className="right-panel">
      <div className="timeline-header">
        <div className="timeline-header-top">
          <h2>Timeline</h2>
          <div className="timeline-controls">
            <div className="timeline-range-buttons">
              {timelineViewOptions.map((option) => (
                <button
                  key={`range-${option.key}`}
                  type="button"
                  className={`timeline-range-btn ${timelineViewKey === option.key ? "active" : ""}`}
                  onClick={() => onSelectTimelineView(option.key)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <GoToComponent {...goToControls} />
          </div>
        </div>
        <p>Hover a task for a second to open details.</p>
      </div>
      <div className="timeline-frame">
        <div ref={timelineCanvasRef} className="timeline-canvas">
          <div ref={timelineContainerRef} className="timeline" />
        </div>
      </div>
    </main>
  );
}
