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
};
