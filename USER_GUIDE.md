# Print Flow Pro: User Guide & Calculation logic

Welcome to **Print Flow Pro**, the precision printing estimator. This guide explains how the system calculates your costs and how to use the various features of the application.

---

## 🛠 Calculation engine: How it works

The calculator uses a professional **Imposition & Weight** logic to derive real-world costs.

### 1. Imposition Logic (Outs)
The system calculates how many project units fit onto a standard "Press Sheet" based on your input dimensions and the machine sheet size selected in Section 3.
- **Formula:** `(Sheet Width / Job Width) * (Sheet Height / Job Height)` (Simplified; the system checks both orientations).
- **Result:** This determines your "Outs" – fewer outs mean more paper sheets are required.

### 2. Paper Weight calculations
The total weight of the paper affects handling and cost estimation.
- **Formula:** `(Total Sheets * Sheet Width * Sheet Height * GSM) / 1,000,000,000` = Weight in Kilograms (KG).

### 3. Cost Breakdown
- **Material Cost:** `Total Sheets * Sheet Price` + `Board Cost` (if applicable).
- **Printing Cost:** `(Total Sheets * Impression Rate) + Plate Costs + Make-Ready`.
- **Applied Finishes:** Area-based costs (SQ Inches) for Foiling/Spot UV + Base setups.
- **Profit Margin:** Applied as a percentage markup on the total **Production Cost**.
- **Tax/VAT:** Calculated on the subtotal (Production + Profit).

---

## 📋 Section-by-Section Breakdown

### Section 1: Job Details
- **Project Type:** Selection of presets (Flyer, Brochure, Packaging). This automatically adjusts default dimensions and GSM.
- **Quantity:** The total number of finished units required.

### Section 2: Materials & Weights
- **GSM (Grams per Square Meter):** Defines the weight/density of the paper.
- **Sheet Price:** The cost you pay your supplier per press sheet (not per job unit).
- **Structural Board:** Used for premium packaging (Rigid boxes). Adds a base board cost and affects thickness calculations.

### Section 3: Printing Setup
- **Machine Selection:** Presets for Small Format (SRA3), Medium (B2), and Large (B1) formats.
- **Sheet Size:** Defines the press sheet area used for imposition.
- **Waste Sheets:** A buffer for setup. Usually 50-100 sheets per color/finish.

### Section 4 & 5: Premium Applied Finishes
- **Area-Based Costs:** For Foiling, Spot UV, and Embossing, the cost is derived from the square inches of coverage.
- **Complexity:** Adding more finishes increments the set-up cost and production time.

### Section 6: Commercial & Logistics
- **Shipping:** Flat rate for delivery.
- **Profit Margin:** Your business markup.
- **Tax/VAT:** Final regulatory surcharge.

---

## 📊 The Master View (Sidebar)
The right-hand panel provides a real-time summary:
- **Unit Cost:** The cost per single piece (critical for quote sensitivity).
- **Margin:** The actual monetary value you are earning on the job.
- **Breakdown Chart:** A visual look at where the majority of the money is going (Materials vs. Printing vs. Profit).

---

## 💾 Saving & History
- **Save Estimate:** Clicking the Save button stores the current configuration in your local browser history.
- **History Tab:** View past estimates, compare different configurations, or delete old records to keep your workspace clean.

---

## 💡 Pro Tips
- **Optimize Imposition:** If your Outs are low, try slightly reducing the job dimensions (e.g., from 210mm to 205mm) to see if you can fit an extra unit on the sheet.
- **Wastage:** Always ensure wastage sheets are sufficient for the complexity of the job. Multi-step finishes (Foil + Spot UV) require more setup sheets than a simple flyer.
