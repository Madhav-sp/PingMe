// ChatHeader.jsx
import { useSelector } from "react-redux";

const ChatHeader = () => {
  const selectedUser = useSelector((state) => state.chat.selectedUser);
  return (
    <div className="flex items-center gap-4 p-4 border-b border-[#1E1E1E] text-white bg-[#0D0D0D] flex-shrink-0">
      <img src={selectedUser?.photoURL} className="w-10 h-10 rounded-full" />
      <div>
        <p className="font-semibold">{selectedUser?.displayName}</p>
        <p className="text-sm text-green-400">
          @{selectedUser?.username || selectedUser?.displayName} • Online
        </p>
      </div>
    </div>
  );
};

export default ChatHeader;
