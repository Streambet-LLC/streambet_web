import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "../ui/sidebar";
import SidebarBody from "./SidebarBody";
import { BettingCategory } from "@/enums";

interface SidebarProps {
  selectedCategory?: BettingCategory | null;
  setSelectedCategory?: (category: BettingCategory | null) => void;
}

export default function Sidebar({ selectedCategory, setSelectedCategory }: SidebarProps) {
  const [defaultOpen] = useState(() => {
    const state = localStorage.getItem("sidebar_state");

    return state !== "false";
  });

  return (
    <div>
      <SidebarProvider className='!transition-none bg-background border-r' defaultOpen={defaultOpen}>
        <SidebarBody selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />
      </SidebarProvider>
    </div>
  )
}