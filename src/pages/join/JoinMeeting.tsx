// src/pages/join/JoinMeeting.tsx
// Join meeting redirect page

import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

/**
 * JoinMeeting Component
 * Redirects from /join/:meetingId to /meet/:meetingId
 * This provides a clean shareable link structure
 */
const JoinMeeting: React.FC = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (meetingId) {
      console.log(`[JOIN] Redirecting to meeting ${meetingId}`);
      navigate(`/meet/${meetingId}`, { replace: true });
    } else {
      console.log("[JOIN] No meeting ID provided, redirecting to dashboard");
      navigate("/dashboard", { replace: true });
    }
  }, [meetingId, navigate]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        backgroundColor: "#18191A",
        color: "white",
        fontFamily: "Rubik, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: "60px",
            height: "60px",
            border: "4px solid rgba(255, 255, 255, 0.1)",
            borderTopColor: "#24C4E8",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 1rem",
          }}
        ></div>
        <p>Uniéndose a la reunión...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default JoinMeeting;
