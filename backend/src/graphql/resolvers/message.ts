import { Prisma, prisma } from "@prisma/client";
import { GraphQLError } from "graphql";
import { GraphQLContext, SendMessageArguments } from "../../util/types";

const resolvers = {
    Query: {},
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
                pubsub.publish("CONVERSATION_UPDATED", {
                    conversationUpdated: {
                        conversation,
                    }
                })


            } catch (error: any) {
                console.log("sendMessage Error", error);
                throw new GraphQLError("Error sending message")
            }


            return true;
        }
    },
    Subscription: {},
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