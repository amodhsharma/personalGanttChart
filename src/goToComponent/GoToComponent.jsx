import "./GoToComponent.css";

export default function GoToComponent({
  showGoToControls,
  goToInputValue,
  goToInputRef,
  onToggleGoToControls,
  onChangeGoToInput,
  onSubmitGoTo,
  goToInputPattern
}) {
  return (
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
            pattern={goToInputPattern}
            inputMode="numeric"
            required
          />
          <button type="submit" className="timeline-range-btn timeline-goto-submit">
            Go
          </button>
        </form>
      ) : null}
    </div>
  );
}
