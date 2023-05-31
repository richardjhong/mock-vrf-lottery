import axios from "axios";

export const subgraphQuery = async (query: any) => {
  try {
    const SUBGRAPH_URL = "https://api.thegraph.com/subgraphs/name/richardjhong/learnweb3v3";
    const response = await axios.post(SUBGRAPH_URL, {
      query,
    });

    if (response.data.errors) {
      console.log(response.data.errors);
      throw new Error(`Error making subgraph query ${response.data.errors}`);
    }
    return response.data.data;
  } catch (err: any) {
    console.error(err);
    throw new Error(`Could not query the subgraph ${err.message}`);
  }
};
