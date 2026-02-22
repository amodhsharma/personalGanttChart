import "./DeletePage.css";
import { formatDeletedAt, formatIsoToDdMmYyyy } from "./deleteLogic";

export default function DeletePage({
  showTrash,
  trashedEvents,
  onClose,
  onRestoreEvent,
  onDeleteEventPermanently,
  onClearTrash
}) {
  if (!showTrash) return null;

  return (
    <section className="trash-panel">
      <div className="trash-head">
        <h3>Trash</h3>
        <div className="trash-head-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="confirm-delete-btn"
            onClick={onClearTrash}
            disabled={trashedEvents.length === 0}
          >
            Empty Trash
          </button>
        </div>
      </div>

      <p className="trash-subtle">Restore events or permanently delete them.</p>

      <div className="trash-list">
        {trashedEvents.length === 0 ? <p className="trash-empty">Trash is empty.</p> : null}

        {trashedEvents.map((event) => (
          <article key={`trash-${event.id}`} className="trash-item">
            <div className="trash-item-main">
              <h4>{event.title}</h4>
              <p>
                {formatIsoToDdMmYyyy(event.startDate)} to {formatIsoToDdMmYyyy(event.endDate)}
              </p>
              <p className="trash-time">Deleted: {formatDeletedAt(event.deletedAt)}</p>
            </div>
            <div className="trash-item-actions">
              <button type="button" className="secondary" onClick={() => onRestoreEvent(event.id)}>
                Restore
              </button>
              <button type="button" className="danger" onClick={() => onDeleteEventPermanently(event.id)}>
                Delete Permanently
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
