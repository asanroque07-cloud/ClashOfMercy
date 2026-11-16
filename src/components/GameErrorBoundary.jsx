// GameErrorBoundary keeps a crash inside the match from turning the whole app
// into a black screen. If anything inside the game throws while rendering, this
// shows a recovery panel and lets the player return to the lobby instead of
// leaving them stuck on an empty page.
import { Component } from "react";

export default class GameErrorBoundary extends Component {
  state = { failed: false, message: "" };

  static getDerivedStateFromError(error) {
    return { failed: true, message: error?.message || "Unknown error" };
  }

  componentDidCatch(error, info) {
    // Keep the technical detail in the console for debugging.
    console.error("Match crashed:", error, info);
  }

  handleReturn = () => {
    this.setState({ failed: false, message: "" });
    this.props.onReturn?.();
  };

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 260,
          display: "grid",
          placeItems: "center",
          padding: 24,
          background: "#0a0c0a",
          color: "#cfd6c4",
          textAlign: "center",
          fontFamily: "monospace",
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "#9acd50",
            }}
          >
            MATCH INTERRUPTED
          </div>
          <p style={{ marginTop: 12, fontSize: 13, lineHeight: 1.6 }}>
            The match stopped unexpectedly. Your save data is unaffected.
          </p>
          <p style={{ marginTop: 6, fontSize: 10, color: "#7c8570" }}>
            {this.state.message}
          </p>
          <button
            type="button"
            onClick={this.handleReturn}
            style={{
              marginTop: 22,
              padding: "10px 20px",
              background: "#76a035",
              color: "#000",
              border: "none",
              fontWeight: 700,
              letterSpacing: "0.08em",
              cursor: "pointer",
            }}
          >
            RETURN TO LOBBY
          </button>
        </div>
      </div>
    );
  }
}
