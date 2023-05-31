export const FETCH_CREATE_GAME = () => {
  return `query {
    games(orderBy:id, orderDirection:desc, first: 1) {
      id
      maxPlayers
      entryFee
      winner
      players
    }
  }`;
};
