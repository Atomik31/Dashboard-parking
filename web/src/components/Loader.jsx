/* Écran de chargement : overlay centré avec barre de progression animée. */
export default function Loader({ message }) {
  return (
    <div className="loader" role="status" aria-live="polite">
      <div className="loader-box">
        <div className="logo">P</div>
        <div className="loader-msg">{message}</div>
        <div className="loader-bar">
          <i />
        </div>
      </div>
    </div>
  );
}
