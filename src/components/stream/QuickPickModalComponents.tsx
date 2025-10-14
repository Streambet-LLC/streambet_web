interface SignInPromptProps {
  onClose: () => void;
  onSignIn: () => void;
}

export const SignInPrompt = ({ onSignIn }: SignInPromptProps) => {
  return (
    <div className="bg-[#181818] p-6 sm:p-8 rounded-[16px] flex flex-col items-center space-y-4 w-full mx-auto">
      <h2 className="text-white text-xl font-semibold">Sign in to play</h2>
      <button
        className="w-full bg-[#BDFF00] text-black font-medium py-3 rounded-full hover:bg-[#9AE600] transition"
        onClick={onSignIn}
      >
        Sign in
      </button>
    </div>
  );
};

export const NoBettingData = () => {
  return (
    <div
      className="relative mx-auto rounded-[16px] shadow-lg p-5 h-[240px]"
      style={{ backgroundColor: 'rgba(24, 24, 24, 1)' }}
    >
      <div className="all-center flex justify-center items-center h-[100px] mt-8">
        <img
          src="/icons/nobettingData.svg"
          alt="no betting data"
          className="w-[100%] h-[100%] object-contain"
        />
      </div>
      <p className="text-2xl text-[rgba(255, 255, 255, 1)] text-center pt-4 pb-4 font-bold">
        No picking options available
      </p>
    </div>
  );
};
