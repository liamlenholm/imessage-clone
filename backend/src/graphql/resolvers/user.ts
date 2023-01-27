
const resolvers = {
    Query: {
        searchUsers: () => {},
    },
    Mutation: {
        createUsername: (_: any, args: { username: string}, context: any) => {
            const {username} = args;

            console.log(username);
        },
    },
};

export default resolvers;