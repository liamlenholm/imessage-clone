import { Prisma, prisma } from "@prisma/client";
import { GraphQLError } from "graphql";
import { withFilter } from "graphql-subscriptions";
import { userIsConversationParticipant } from "../../util/functions";
import { GraphQLContext, MessagePopulated, MessageSentSubscriptionPayload, SendMessageArguments } from "../../util/types";
import { conversationPopulated } from "./conversation";

const resolvers = {
    Query: {
        messages: async function(_: any, args: {conversationId: string}, context: GraphQLContext): Promise<Array<MessagePopulated>> {

            const {session, prisma} = context
            const {conversationId} = args


            if (!session?.user) {
                throw new GraphQLError("Not Authorized!")
            }

            const {user: {id: userId}} = session

            //Verify that User is participant in the conversation
            const conversation = await prisma.conversation.findUnique({
                where: {
                    id: conversationId,
                },
                include: conversationPopulated
            });

            if (!conversation) {
                throw new GraphQLError("Conversation Not Found")
            }

            const allowedToView = userIsConversationParticipant(conversation.participants, userId)
            
            if (!allowedToView) {
                throw new GraphQLError("Not Authorized!")
            }
            
            try {
                const messages = await prisma.message.findMany({
                    where: {
                        conversationId
                    },
                    include: messagePopulated,
                    orderBy: {
                        createdAt: "desc",
                    },
                })

                return messages;
            } catch (error: any) {
                console.log("messages Error", error)
                throw new GraphQLError(error?.message)
            }

        }
    },
    Mutation: {
        sendMessage: async function(_: any, args: SendMessageArguments, context: GraphQLContext): Promise<boolean> {

            const {session, prisma, pubsub} = context;

            if (!session?.user) {
                throw new GraphQLError("Not Authorized!")
            }

            const {id: userId} = session.user;
            const {id: messageId, senderId, conversationId, body} = args
            
            if (userId !== senderId) {
                throw new GraphQLError("Not Authorized!")
            }


            try {
                const newMessage = await prisma.message.create({
                    data: {
                        id: messageId,
                        senderId,
                        conversationId,
                        body,
                    },
                    include: messagePopulated
                })

                const conversation = await prisma.conversation.update({
                    where: {
                        id: conversationId,
                    },
                    data: {
                        latestMessageId: newMessage.id,
                        participants: {
                            update: {
                                where: {
                                    id: senderId,
                                },
                                data: {
                                    hasSeenLatestMessage: true,

                                },
                            },
                            updateMany: {
                                where: {
                                    NOT: {
                                        userId: senderId
                                    },
                                },
                                data: {
                                    hasSeenLatestMessage: false,
                                },
                            }
                        }
                    }
                });


                pubsub.publish("MESSAGE_SENT", {messageSent: newMessage});
                // pubsub.publish("CONVERSATION_UPDATED", {
                //     conversationUpdated: {
                //         conversation,
                //     }
                // })


            } catch (error: any) {
                console.log("sendMessage Error", error);
                throw new GraphQLError("Error sending message")
            }


            return true;
        }
    },
    Subscription: {
        messageSent: {
            subscribe: withFilter((_: any, __: any, context: GraphQLContext) => {
                const {pubsub} = context
                return pubsub.asyncIterator(['MESSAGE_SENT'])
            }, (payload: MessageSentSubscriptionPayload, args: { conversationId: string }, context: GraphQLContext) => {
                return payload.messageSent.conversationId === args.conversationId
            })
        }
    },
}

export const messagePopulated = Prisma.validator<Prisma.MessageInclude>()({
    sender: {
        select: {
            id: true,
            username: true,
        }
    }
})

export default resolvers;