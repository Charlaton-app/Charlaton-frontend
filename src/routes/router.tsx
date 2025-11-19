import { createBrowserRouter, Navigate } from "react-router-dom";
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
  {
    path: "/dashboard",
    element: <Dashboard />,
  },
  {
    path: "/profile",
    element: <Profile />,
  },
  {
    path: "/chat",
    element: <Chat />,
  },
];

export const router = createBrowserRouter(routes);
