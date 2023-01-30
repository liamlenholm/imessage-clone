import { prisma, Prisma } from "@prisma/client";
import { ApolloError } from "apollo-server-core";
import { GraphQLContext } from "../../util/types";

const resolvers = {
    Mutation: {
        createConversation: async (_: any, args: {participantIds: Array<string> }, context: GraphQLContext): Promise<{conversationId: string}> => {

            const {participantIds} = args;
            const {session, prisma} = context;

            if (!session?.user) {
                throw new ApolloError("Not Authorized!;")
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
 
                return {
                    conversationId: conversation.id,
                };
            } catch (error) {
               console.log("createConversation Error", error);
               throw new ApolloError("Error creating new conversation"); 
            }

        },
    },
}

export const participantPopulated = Prisma.validator<Prisma.ConversationParticipantInclude>()({
    user: {
        select: {
            id: true,
            username: true,
        },
    },
})

export const conversationPopulated = Prisma.validator<Prisma.ConversationInclude>()({
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
})
export default resolvers;