import { gql, useMutation, useQuery, useSubscription } from "@apollo/client";
import { Box, Button } from "@chakra-ui/react";
import { Session } from "next-auth";
import ConversationList from "./ConversationList";
import ConversationOperations from "../../../graphql/operations/conversation";
import {
  ConversationDeletedData,
  ConversationsData,
  ConversationUpdatedData,
} from "../../../util/types";
import {
  ConversationPopulated,
  ParticipantPopulated,
} from "../../../../../backend/src/util/types";
import { cache, useEffect } from "react";
import { useRouter } from "next/router";
import SkeletonLoader from "../../common/SkeletonLoader";

interface ConversationsWrapperProps {
  session: Session;
}

const ConversationsWrapper: React.FC<ConversationsWrapperProps> = ({
  session,
}) => {
  const {
    data: conversationsData,
    error: conversationsError,
    loading: conversationsLoading,
    subscribeToMore,
  } = useQuery<ConversationsData, null>(
    ConversationOperations.Queries.conversations
  );

  const router = useRouter();
  const {
    query: { conversationId },
  } = router;
  const {
    user: { id: userId },
  } = session;

  const onViewConversation = async (conversationId: string) => {
    //Push the conversationId to the router query params

    router.push({ query: { conversationId } });

    //Mark the conversation as read
  };

  const subscribeToNewConversations = () => {
    subscribeToMore({
      document: ConversationOperations.Subscriptions.conversationCreated,
      updateQuery: (
        prev,
        {
          subscriptionData,
        }: {
          subscriptionData: {
            data: { conversationCreated: ConversationPopulated };
          };
        }
      ) => {
        if (!subscriptionData.data) return prev;
        const newConversation = subscriptionData.data.conversationCreated;
        return Object.assign({}, prev, {
          conversations: [newConversation, ...prev.conversations],
        });
      },
    });
  };

  useEffect(() => {
    subscribeToNewConversations();
  }, []);

  return (
    <Box
      display={{ base: conversationId ? "none" : "flex", md: "flex" }}
      width={{ base: "100%", md: "400px" }}
      bg="whiteAlpha.50"
      flexDirection="column"
      gap={4}
      py={6}
      px={3}
    >
      {conversationsLoading ? (
        <SkeletonLoader count={7} height="80px" />
      ) : (
        <ConversationList
          session={session}
          conversations={conversationsData?.conversations || []}
          onViewConversation={onViewConversation}
        />
      )}
    </Box>
  );
};

export default ConversationsWrapper;
