import { createBrowserRouter } from "react-router-dom";
import Home from "../pages/home/Home";
import Login from "../pages/login/Login";
import Signup from "../pages/signup/Signup";
import Recovery from "../pages/recovery/Recovery";
import Success from "../pages/success/Success";
import ResetPassword from "../pages/reset/ResetPassword";
import About from "../pages/about/About";
import Dashboard from "../pages/dashboard/Dashboard";
import Profile from "../pages/profile/Profile";
import Chat from "../pages/chat/Chat";
import Meeting from "../pages/meeting/Meeting";
import JoinMeeting from "../pages/join/JoinMeeting";
import Resumenes from "../pages/resumenes/Resumenes";
import ProtectedRoute from "../components/ProtectedRoute/ProtectedRoute";

export const routes = [
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/signup",
    element: <Signup />,
  },
  {
    path: "/recovery",
    element: <Recovery />,
  },
  {
    path: "/signup-success",
    element: <Success />,
  },
  {
    path: "/reset-password",
    element: <ResetPassword />,
  },
  {
    path: "/about",
    element: <About />,
  },
  // Rutas protegidas - requieren autenticación
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/profile",
    element: (
      <ProtectedRoute>
        <Profile />
      </ProtectedRoute>
    ),
  },
  {
    path: "/resumenes",
    element: (
      <ProtectedRoute>
        <Resumenes />
      </ProtectedRoute>
    ),
  },
  {
    path: "/chat",
    element: (
      <ProtectedRoute>
        <Chat />
      </ProtectedRoute>
    ),
  },
  {
    path: "/meet/:meetingId",
    element: (
      <ProtectedRoute>
        <Meeting />
      </ProtectedRoute>
    ),
  },
  {
    path: "/join/:meetingId",
    element: (
      <ProtectedRoute>
        <JoinMeeting />
      </ProtectedRoute>
    ),
  },
];

export const router = createBrowserRouter(routes);
