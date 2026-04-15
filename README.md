# 🚀 Predict For Good (P4G)

> **Stake. Win. Give Back.**
> A decentralized prediction platform where users stake ETH on match outcomes — and a portion goes directly to charity. Built to combine **Web3 incentives + social impact**.

---

## 🌍 Live Links

* 🔗 **Frontend (Vercel):** *[Add your Vercel link here]*
* 🎥 **Demo Video:** *[Add your video link here]*

---

## 🧠 Idea Behind the Project

Most prediction platforms are purely profit-driven.
**Predict For Good** changes that.



💡 Users predict match outcomes → winners earn rewards
❤️ A fixed portion of every pool goes to **charity**

🎯 Unlike traditional prediction systems that feel like gambling, **P4G focuses on transparency, fairness, and purpose**.
Every action is recorded on-chain, making the system open and verifiable for everyone.

🌱 And the best part? Even beyond rewards, a significant share of the funds is redirected towards **meaningful causes and donations** — turning every prediction into an opportunity to create real-world impact.

✨ Win or lose, your participation contributes to something bigger.


---

## ⚙️ How It Works

### 1. 🏏 Match Creation (Admin)

* Admin creates matches with:

  * Team A vs Team B
  * Start Time
  * Lock Time (prediction deadline)

### 2. 💸 User Participation

* Users:

  * Connect wallet
  * Choose a team
  * Stake ETH

### 3. 🔒 Lock Phase

* After lock time:

  * No more predictions allowed

### 4. 🧾 Result Declaration (Admin)

* Admin declares winner

### 5. 🏆 Reward Distribution

* Pool distribution:

  * 🥇 Winners get rewards
  * ❤️ 65% allocated to charity

---

## 🧱 Smart Contract Architecture

### 📌 Core Contract

Handles:

* Match creation
* Prediction logic
* Result resolution
* Fund distribution

### 📌 Donation Contract

Handles:

* Charity registration
* Fund allocation
* Transparency of donations

### 🔐 Security Features

* `ReentrancyGuard` protection
* Access control (`onlyOwner`)
* Match state validation modifiers

---

## 🖥️ Frontend Features

Built with **Next.js + TailwindCSS (Glass UI Style)**

### ✨ Key Components

* 🔌 Wallet Connection (MetaMask)
* 📊 Match Dashboard
* 🎯 Prediction Interface
* 📈 Live Pool Tracking
* 👑 Admin Panel
* 🔔 Toast Notifications

### 💎 UI Highlights

* Glassmorphism design
* Clean & minimal layout
* Real-time UX feedback

---

## 🔗 Web3 Integration

* **ethers.js**

  * Provider & Signer setup
  * Smart contract interaction
* ABI-based contract calls
* Real-time state updates

---

## 🧪 Challenges Faced

### ⚠️ 1. Admin vs User Flow

Issue:

* Admin actions were mixed with user UI

Fix:

* Separated logic + conditional rendering for roles

---

### ⚠️ 2. Script-Based Match Creation Showing in UI

Issue:

* UI was prompting to run scripts instead of using contract calls

Fix:

* Removed script dependency
* Shifted to direct smart contract interaction via frontend

---

### ⚠️ 3. State Sync Issues (Frontend ↔ Contract)

Issue:

* UI not updating after transactions

Fix:

* Added proper async handling + state refresh logic

---

## 🚀 Future Improvements

* 📱 Mobile responsiveness
* 🌐 Multi-chain support
* 🧠 AI-based prediction insights
* 🏦 DAO governance for charity selection
* 📊 Advanced analytics dashboard

---

## 📂 Project Structure

```
/backend
  ├── contracts
  ├── scripts
  ├── test

/frontend
  ├── components
  ├── pages
  ├── lib (ethers setup)
  ├── styles
```

---

## 🛠️ Tech Stack

* **Frontend:** Next.js, TailwindCSS
* **Blockchain:** Solidity, Foundry
* **Web3:** ethers.js
* **Deployment:** Vercel
* **Wallet:** MetaMask

---

## 🧑‍💻 Getting Started

### 1. Clone Repo

```bash
git clone https://github.com/areebatahir11/Wirefluid-Hackathon
```

### 2. Install Dependencies

```bash
cd frontend
npm install
```

### 3. Run Frontend

```bash
npm run dev
```

### 4. Setup Backend (Foundry)

```bash
forge build
forge test
```

---

## 🤝 Contribution

Open to improvements, ideas, and collaborations!
Feel free to fork and build on top 🚀

---

## 💖 Final Note

This project is more than just a prediction dApp.
It’s a step toward **purpose-driven Web3 applications**.

---

## 🏁

**Built with heart — Areeba 💚**
