import { CreateUsernameResponse, GraphQLContext } from "../../util/types";

const resolvers = {
    Query: {
        searchUsers: () => {},
    },
    Mutation: {
        createUsername: async (_: any, args: { username: string}, context: GraphQLContext): Promise<CreateUsernameResponse> => {
            const {username} = args;
            const { session, prisma } = context;

            if (!session?.user) {
                return {
                    error: "Not Authorized!"
                }
            }
            
            const { id: userId } = session.user;

            try {
                
                //Check that Username is not taken
                const existingUser = await prisma.user.findUnique({
                    where: {
                        username,
                    },
                });

                if (existingUser) {
                    return {
                        error: "Username already taken.",

                    }
                }
                
                //Update User
                await prisma.user.update({
                    where: {
                        id: userId,
                    },
                    data: {
                        username,
                    }
                });

                return { success: true }

            } catch (error) {
                console.log("createUsername Error", error)
                return {
                    error: error?.message,
                }
            }
            
        },
    },
};

export default resolvers;