# Solana Volume Bot

Welcome to the Solana Volume Bot, an open-source script designed to help you achieve desired transaction volumes on the Solana blockchain. This powerful tool is perfect for users looking to manage multiple transactions efficiently and effectively.


OPEN Source Version:


![2025-03-19_15-44-52](https://github.com/user-attachments/assets/ac204ca8-eba9-4d08-929c-1de6dc5db786)
![2025-03-19_15-48-11](https://github.com/user-attachments/assets/6b2245ec-f452-482e-a88a-accc4450d560)
![2025-03-19_15-48-33](https://github.com/user-attachments/assets/6cc6f0ab-1064-48df-98d8-b471f2fa4a05)
![2025-03-19_15-48-46](https://github.com/user-attachments/assets/dba15652-4064-4317-a8c4-10aa7bb785b3)
![2025-03-19_15-48-59](https://github.com/user-attachments/assets/3030b8a8-ecb1-4719-a710-f8602424468e)
![2025-03-19_15-49-18](https://github.com/user-attachments/assets/46fc76ab-abd5-4b8b-b85b-2742b21d30aa)
![2025-03-19_15-49-28](https://github.com/user-attachments/assets/965d93f7-156b-45ca-9225-3fdc97ff989d)
![2025-03-19_15-49-49](https://github.com/user-attachments/assets/5b4a65b0-2581-4241-ac47-39bad6c3fcd2)


## Getting Started

To get started with the Solana Volume Bot, follow these steps to ensure a smooth setup and execution process.

### 1. Setup

#### a) Install Dependencies
Run the following command to install the necessary dependencies for the backend:
`npm i`
For the frontend:
`cd pumpfun-volume-bot-ui`
`npm i`

#### b) Configure Environment Variables
Edit the `config.ts` file to include your wallet private key and RPC URL:
- **Wallet Private Key:** The wallet you enter in the config pays for Jito tips and sends all the SOL/WSOL.
- **RPC URL:** Your Solana RPC endpoint.

#### c) Start the Script
Run the script with the following command in the root folder:
`node run dev`
For running frontend, you need to run this command:
`cd pumpfun-volume-bot-ui`
`npm run dev`

### 2. Execution Steps

**Important:** Run all steps in order and do not create new keypairs unless you reclaim your SOL.

#### a) Create New Wallet Keypairs
Step 1: Create new wallet keypairs for your volume transactions. This step is necessary if you want to ensure fresh keypairs.

#### b) Distribute SOL/WSOL
Step 2: Distribute SOL/WSOL to the keypairs.
- **Gas Fees:** The SOL you send here is ONLY FOR GAS FEES. It is recommended to send anywhere from 0.05 to 1 SOL.
- **Volume Spam:** This is the amount of SOL each keypair will use to volume spam and rotate. You can enter any custom amount to look natural.

#### c) Simulate Volume
Step 3: Simulate all volume and calculate all Jito tip fees and Raydium 5bps fee to see EXACTLY how much you will spend to achieve the volume you want. This step ensures you know the exact costs involved.

#### d) Volume Bot
Step 4: Execute the volume bot to get your desired volume. It is recommended to set a timeout between swaps at around 3-10 seconds to look natural.

#### e) Retrieve Funds
Step 5: Retrieve all funds from the keypairs automatically. This step will retrieve all the WSOL and SOL you sent and send it to the wallet in the config file.

### Conclusion

This Solana Volume Bot is a robust tool for managing multiple transactions on the Solana blockchain. By following the setup and execution steps outlined above, you can efficiently handle buying and selling operations with ease.
For more information, reach out me via [TELEGRAM](https://t.me/daveex0086)
