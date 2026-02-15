/**
 * WheelHub Component
 * Renders the mechanical center hub with layered rings and center bolt
 */
export function WheelHub() {
  return (
    <>
      {/* Outer hub ring */}
      <div className="absolute inset-0 m-auto w-[28%] h-[28%] rounded-full bg-gradient-to-br from-gray-600 to-gray-800 border-4 border-gray-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8),0_4px_8px_rgba(0,0,0,0.6)]" />
      
      {/* Inner hub ring */}
      <div className="absolute inset-0 m-auto w-[16%] h-[16%] rounded-full bg-gradient-to-br from-gray-400 to-gray-600 border-2 border-gray-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6),0_2px_4px_rgba(0,0,0,0.4)]" />
      
      {/* Center bolt */}
      <div className="absolute inset-0 m-auto w-[6%] h-[6%] rounded-full bg-gray-300 border border-gray-400 shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
    </>
  );
}
