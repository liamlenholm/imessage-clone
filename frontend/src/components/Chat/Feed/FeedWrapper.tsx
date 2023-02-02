import { Flex } from "@chakra-ui/react";
import { Session } from "next-auth";
import { useRouter } from "next/router";
import MessagesHeader from "./Messages/Header";
import MessageInput from "./Messages/Input";

interface FeedWrapperProps {
  session: Session;
}

const FeedWrapper: React.FC<FeedWrapperProps> = ({ session }) => {
  const router = useRouter();

  const { conversationId } = router.query;
  const {
    user: { id: userId },
  } = session;

  return (
    <Flex
      width="100%"
      direction="column"
      display={{ base: conversationId ? "flex" : "none", md: "flex" }}
    >
      {conversationId && typeof conversationId === "string" ? (
        <>
          <Flex
            flexDirection="column"
            justify="space-between"
            overflow="hidden"
            flexGrow={1}
          >
            <MessagesHeader userId={userId} conversationId={conversationId} />
            {/* <Messages /> */}
          </Flex>
          <MessageInput session={session} conversationId={conversationId} />
        </>
      ) : (
        <div>No Convo Selected</div>
      )}
    </Flex>
  );
};

export default FeedWrapper;
