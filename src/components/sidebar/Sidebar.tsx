import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "../ui/sidebar";
import SidebarBody from "./SidebarBody";

export default function Sidebar() {
  const [defaultOpen] = useState(() => {
    const state = localStorage.getItem("sidebar_state");

    return state !== "false";
  });

  return (
    <div>
      <SidebarProvider className='!transition-none bg-background border-r' defaultOpen={defaultOpen}>
        <SidebarBody />
      </SidebarProvider>
    </div>
  )
}