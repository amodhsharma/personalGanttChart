import "./RightPanel.css";

export default function RightPanel({
  timelineViewOptions,
  timelineViewKey,
  onSelectTimelineView,
  showGoToControls,
  goToInputValue,
  goToInputRef,
  onToggleGoToControls,
  onChangeGoToInput,
  onSubmitGoTo,
  hasGoToMarker,
  goToMarkerLeft,
  onClearGoTo,
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
            <div className="timeline-goto-row">
              <button
                type="button"
                className={`timeline-range-btn timeline-goto-trigger ${showGoToControls ? "active" : ""}`}
                onClick={onToggleGoToControls}
              >
                Go-To
              </button>
              {showGoToControls ? (
                <form className="timeline-goto-form" onSubmit={onSubmitGoTo}>
                  <input
                    ref={goToInputRef}
                    type="text"
                    value={goToInputValue}
                    onChange={onChangeGoToInput}
                    placeholder="dd-mm-yyyy"
                    pattern="[0-9]{2}-[0-9]{2}-[0-9]{4}"
                    inputMode="numeric"
                    required
                  />
                  <button type="submit" className="timeline-range-btn timeline-goto-submit">
                    Go
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </div>
        <p>Hover a task for a second to open details.</p>
      </div>
      <div className="timeline-frame">
        <div className="timeline-canvas">
          <div ref={timelineContainerRef} className="timeline" />
          {hasGoToMarker ? (
            <div className="goto-marker" style={{ left: `${goToMarkerLeft}px` }}>
              <button type="button" className="goto-marker-pin" onClick={onClearGoTo} aria-label="Clear go-to marker">
                ×
              </button>
              <div className="goto-marker-line" />
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
