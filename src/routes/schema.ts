import Joi from 'joi';
export default {
  credential: Joi.object().keys({
    email: Joi.string().required().email(),
    password: Joi.string().required().min(6),
  }),
  refreshToken: Joi.object().keys({
    refreshToken: Joi.string().required().min(1),
  }),
  // auth: Joi.object()
  //   .keys({ 
  //     authorization: JoiAuthBearer().required(),
  //   })
  //   .unknown(true),
  signup: Joi.object().keys({
    name: Joi.string().required().min(3),
    email: Joi.string().required().email(),
    password: Joi.string().required().min(6),
    profilePicUrl: Joi.string().optional().uri(),
  }),
  distributionToWallets: Joi.object().keys({
    sniperAmount: Joi.number().optional().min(0),
    commonAmounts: Joi.array().required().items(Joi.number().min(0)),
  }),
  sellByPercentage: Joi.object().keys({
    walletSK: Joi.string().required(),
    percentage: Joi.number().required().min(0).max(100),
  }),
  sellByAmount: Joi.object().keys({
    walletSK: Joi.string().required(),
    tokenAmount: Joi.number().required().min(0),
  }),
  generateCommonWallets: Joi.object().keys({
    nums: Joi.string().required().min(1).max(2),
  }),
  setWallets: Joi.object().keys({
    dev: Joi.string().optional().max(100),
    sniper: Joi.string().optional().max(100),
    fund: Joi.string().optional().max(100),
    common: Joi.array().optional().items(Joi.string().max(100))
  }),
  setFundWallet: Joi.object().keys({
    fund: Joi.string().required().max(100),
  }),
  
  // RPC and WEBSOCKET ENDPOINT, JITO_FEE
  setNetwork: Joi.object().keys({
    RPC_ENDPOINT: Joi.string().optional(),
    RPC_WEBSOCKET_ENDPOINT: Joi.string().optional(),
    JITO_FEE: Joi.number().optional().min(0),
  }),
  setBuyAmounts: Joi.object().keys({
    dev: Joi.number().required().min(0),
    sniper: Joi.number().required().min(0),
    common: Joi.array().required().items(Joi.number().min(0)),
  }),
  setSellPercentage: Joi.object().keys({
    sellPercentage: Joi.array().length(4).required().items(Joi.number().min(0).less(100)),
  }),
  setSellAmount: Joi.object().keys({
    sellAmount: Joi.number().required().min(0),
  }),
  setTokenMetadata: Joi.object().keys({
    name: Joi.string().required(),
    symbol: Joi.string().required(),
    metadataUri: Joi.string().required().uri(),
    mintPrivateKey: Joi.string().required(),
  }),
  removeCommonWallet: Joi.object().keys({
    wallet: Joi.string().required(),
  }),
  setUser: Joi.object().keys({
    name: Joi.string().required(),
    authKey: Joi.string().required().length(32),
  }),
  deleteUser: Joi.object().keys({
    authKey: Joi.string().required().length(32),
  }),
  editUser: Joi.object().keys({
    authKey: Joi.string().required().length(32),
    newUsername: Joi.string().optional(),
  }),
  authKeyCheck: Joi.object().keys({
    authKey: Joi.string().required().length(32),
  }),
  authAdmin: Joi.object().keys({
    authKey: Joi.string().required(),
  }),
};
