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
  })
};
