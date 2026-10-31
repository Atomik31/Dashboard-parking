/* Écran de chargement : overlay centré avec barre de progression animée. */
export default function Loader({ message }) {
  return (
    <div className="pk-loader" role="status" aria-live="polite">
      <div className="pk-loader-box">
        <div className="pk-logo">P</div>
        <div className="pk-loader-msg">{message}</div>
        <div className="pk-loader-bar">
          <i />
        </div>
      </div>
    </div>
  );
}
