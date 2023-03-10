import { Prisma } from "@prisma/client";
import {GraphQLError} from "graphql";
import { withFilter } from "graphql-subscriptions";
import {

    ConversationPopulated,
    GraphQLContext,
  } from "../../util/types";
  import { userIsConversationParticipant } from "../../util/functions";



const resolvers = {
    Query: {
        conversations: async (_: any, __: any, context: GraphQLContext): Promise<Array<ConversationPopulated>> => {
            const {session, prisma} = context;

            if (!session?.user) {
                throw new GraphQLError("Not Authorized!;")
            }

            const {user: {id: userId}} = session;

            try {

                const conversations = await prisma.conversation.findMany({
                //     where: {
                //         participants: {
                //             some: {
                //                 userId: {
                //                     equals: userId,
                //                 }
                //             }
                //         }
                //     }
                // })
                include: conversationPopulated,
                });

                return conversations.filter(conversation => !!conversation.participants.find(p => p.userId === userId))


                
            } catch (error: any) {
                console.log("conversations Error", error);
                throw new GraphQLError(error?.message)
            }
        }
    
    },

    Mutation: {
        createConversation: async (_: any, args: {participantIds: Array<string> }, context: GraphQLContext): Promise<{conversationId: string}> => {

            const {participantIds} = args;
            const {session, prisma, pubsub} = context;

            if (!session?.user) {
                throw new GraphQLError("Not Authorized!;")
            }

            const {user: {id: userId}} = session;

            try {
            
                const conversation = await prisma.conversation.create({
                    data: {
                        participants: {
                            createMany: {
                                data: participantIds.map(id => ({
                                    userId: id,
                                    hasSeenLatestMessage: id === userId,
                                })),
                            },
                        },
                    },
                    include: conversationPopulated,
                });

                pubsub.publish("CONVERSATION_CREATED", {
                    conversationCreated: conversation,
                });
 
                return {
                    conversationId: conversation.id,
                };
            } catch (error) {
               console.log("createConversation Error", error);
               throw new GraphQLError("Error creating new conversation"); 
            }

        },
    },

    Subscription: {
        conversationCreated: {
          subscribe: withFilter(
            (_: any, __: any, context: GraphQLContext) => {
              const { pubsub } = context;
    
              return pubsub.asyncIterator(["CONVERSATION_CREATED"]);
            },
            (
              payload: ConversationCreatedSubscriptionPayload,
              _,
              context: GraphQLContext
            ) => {
              const { session } = context;
    
              if (!session?.user) {
                throw new GraphQLError("Not authorized");
              }
    
              const {
                conversationCreated: { participants },
              } = payload;
    
              const userIsParticipant = userIsConversationParticipant(
                participants,
                session.user.id
              );
    
              return userIsParticipant;
            }
          ),
        },
    },
}

export interface ConversationCreatedSubscriptionPayload {
    conversationCreated: ConversationPopulated;
}

export const participantPopulated = Prisma.validator<Prisma.ConversationParticipantInclude>()({
    user: {
        select: {
            id: true,
            username: true,
        },
    },
})

export const conversationPopulated =
  Prisma.validator<Prisma.ConversationInclude>()({
    participants: {
      include: participantPopulated,
    },
    latestMessage: {
      include: {
        sender: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    },
  });

export default resolvers;