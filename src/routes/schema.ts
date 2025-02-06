import Joi from 'joi';
import { JITO_FEE, RPC_ENDPOINT, RPC_WEBSOCKET_ENDPOINT } from '../config';
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
    sniperAmount: Joi.number().required().greater(0),
    commonAmounts: Joi.array().required().items(Joi.number().greater(0)),
  }),
  generateCommonWallets: Joi.object().keys({
    nums: Joi.string().required().min(1).max(2),
  }),
  importWallets: Joi.object().keys({
    dev: Joi.string().optional().max(100),
    sniper: Joi.string().optional().max(100),
    fund: Joi.string().optional().max(100),
    common: Joi.array().optional().items(Joi.string().max(100))
  }),
  importFundWallet: Joi.object().keys({
    fund: Joi.string().required().max(100),
  }),
  
  // RPC and WEBSOCKET ENDPOINT, JITO_FEE
  setNetwork: Joi.object().keys({
    RPC_ENDPOINT: Joi.string().optional(),
    RPC_WEBSOCKET_ENDPOINT: Joi.string().optional(),
    JITO_FEE: Joi.number().optional().greater(0),
  }),
  setBuyAmounts: Joi.object().keys({
    dev: Joi.number().required().greater(0),
    sniper: Joi.number().required().greater(0),
    common: Joi.array().required().items(Joi.number().greater(0)),
  }),
  setSellPercentage: Joi.object().keys({
    sellPercentage: Joi.array().length(4).required().items(Joi.number().greater(0).less(100)),
  }),
  setSellAmount: Joi.object().keys({
    sellAmount: Joi.number().required().greater(0),
  }),
  setTokenMetadata: Joi.object().keys({
    name: Joi.string().required(),
    symbol: Joi.string().required(),
    metadataUri: Joi.string().required().uri(),
    mintPrivateKey: Joi.string().required(),
  }),
};
