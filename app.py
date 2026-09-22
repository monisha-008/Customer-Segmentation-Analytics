"""
Customer Segmentation Analytics Dashboard
A reliable, reproducible, traceable customer segmentation platform.
Runs via: streamlit run app.py
"""

import io
import streamlit as st
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score
import plotly.express as px
import plotly.graph_objects as go

# ---------------------------------------------------------
# Page Configuration
# ---------------------------------------------------------
st.set_page_config(
    page_title="Customer Segmentation Analytics",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.title("📊 Customer Segmentation Analytics Dashboard")
st.caption("Deterministic, Reproducible & Traceable Machine Learning Pipeline (K-Means & PCA)")

# ---------------------------------------------------------
# 1. Performance / Scale & Sample Generator
# ---------------------------------------------------------
@st.cache_data(show_spinner=False)
def generate_sample_data(n_samples: int = 10000, seed: int = 42) -> pd.DataFrame:
    """Generate realistic customer dataset scaling up to 10,000 rows."""
    rng = np.random.default_rng(seed)
    
    # Create 4 latent archetypes to mimic real customer segments
    n_per_group = n_samples // 4
    remainder = n_samples - (n_per_group * 4)

    # Group 1: Affluent spenders
    g1_income = rng.normal(90000, 15000, n_per_group).clip(55000, 150000)
    g1_spending = rng.normal(82, 10, n_per_group).clip(60, 100)
    g1_age = rng.integers(24, 52, n_per_group)
    g1_recency = rng.integers(1, 28, n_per_group)
    g1_freq = rng.integers(15, 45, n_per_group)

    # Group 2: Affluent savers / potential
    g2_income = rng.normal(88000, 14000, n_per_group).clip(55000, 145000)
    g2_spending = rng.normal(25, 9, n_per_group).clip(1, 45)
    g2_age = rng.integers(32, 65, n_per_group)
    g2_recency = rng.integers(14, 75, n_per_group)
    g2_freq = rng.integers(4, 16, n_per_group)

    # Group 3: Budget high spenders
    g3_income = rng.normal(32000, 8000, n_per_group).clip(15000, 48000)
    g3_spending = rng.normal(78, 11, n_per_group).clip(55, 99)
    g3_age = rng.integers(18, 38, n_per_group)
    g3_recency = rng.integers(3, 35, n_per_group)
    g3_freq = rng.integers(10, 30, n_per_group)

    # Group 4: Low income, low spending / at-risk
    n4 = n_per_group + remainder
    g4_income = rng.normal(34000, 9000, n4).clip(15000, 49000)
    g4_spending = rng.normal(22, 10, n4).clip(1, 45)
    g4_age = rng.integers(30, 72, n4)
    g4_recency = rng.integers(45, 120, n4)
    g4_freq = rng.integers(1, 8, n4)

    incomes = np.concatenate([g1_income, g2_income, g3_income, g4_income])
    spendings = np.concatenate([g1_spending, g2_spending, g3_spending, g4_spending])
    ages = np.concatenate([g1_age, g2_age, g3_age, g4_age])
    recencies = np.concatenate([g1_recency, g2_recency, g3_recency, g4_recency])
    frequencies = np.concatenate([g1_freq, g2_freq, g3_freq, g4_freq])

    # Shuffle
    idx = rng.permutation(n_samples)
    
    df = pd.DataFrame({
        "CustomerID": [f"CUST-{100001 + i}" for i in range(n_samples)],
        "Age": ages[idx],
        "Annual Income ($)": np.round(incomes[idx], -2),
        "Spending Score (1-100)": np.round(spendings[idx], 1),
        "Purchase Frequency": frequencies[idx],
        "Recency (Days)": recencies[idx],
        "Member Tier": rng.choice(["Bronze", "Silver", "Gold", "Platinum"], size=n_samples, p=[0.45, 0.3, 0.18, 0.07])
    })

    # Add sparse missing values for testing missing-value strategy
    # 0.5% rows have missing income/spending, few have >50% missing
    mask_sparse = rng.random(n_samples) < 0.015
    df.loc[mask_sparse, "Annual Income ($)"] = np.nan
    mask_sparse_sp = rng.random(n_samples) < 0.012
    df.loc[mask_sparse_sp, "Spending Score (1-100)"] = np.nan

    # Add 12 rows with >50% missing fields to test explicit dropping rule
    severe_drop_idx = rng.choice(n_samples, size=12, replace=False)
    for i in severe_drop_idx:
        df.loc[i, ["Age", "Annual Income ($)", "Spending Score (1-100)", "Purchase Frequency"]] = np.nan

    return df

# ---------------------------------------------------------
# 2. Missing-Value Handling Strategy
# ---------------------------------------------------------
@st.cache_data(show_spinner=False)
def clean_and_impute_dataset(df_raw: pd.DataFrame):
    """
    Explicit missing value strategy:
    1. Calculate % missing fields in every row.
    2. Drop rows where > 50% of fields are missing.
    3. Impute numerical columns with column median.
    4. Impute categorical columns with column mode.
    5. Returns cleaned copy without altering original dataframe.
    """
    df_clean = df_raw.copy()
    initial_rows = len(df_clean)
    num_cols = df_clean.shape[1]

    # 1. Calculate percentage of missing fields per row
    missing_pct_per_row = df_clean.isnull().sum(axis=1) / num_cols

    # 2. Drop rows where > 50% missing
    severe_missing_mask = missing_pct_per_row > 0.50
    rows_removed = int(severe_missing_mask.sum())
    df_clean = df_clean[~severe_missing_mask].copy()

    # 3. Impute numerical columns using median
    imputed_stats = {}
    for col in df_clean.columns:
        if pd.api.types.is_numeric_dtype(df_clean[col]):
            missing_count = int(df_clean[col].isnull().sum())
            if missing_count > 0:
                median_val = df_clean[col].median()
                df_clean[col] = df_clean[col].fillna(median_val)
                imputed_stats[col] = f"Median ({median_val:.1f})"
        else:
            missing_count = int(df_clean[col].isnull().sum())
            if missing_count > 0:
                mode_series = df_clean[col].mode()
                mode_val = mode_series[0] if not mode_series.empty else "Unknown"
                df_clean[col] = df_clean[col].fillna(mode_val)
                imputed_stats[col] = f"Mode ({mode_val})"

    return df_clean, initial_rows, len(df_clean), rows_removed, imputed_stats

# ---------------------------------------------------------
# 3. Deterministic Preprocessing, K-Means & Evaluation
# ---------------------------------------------------------
@st.cache_data(show_spinner=False)
def compute_clustering_pipeline(data_dict: dict, selected_features: list, k: int):
    """
    Fit K-Means using StandardScaler with random_state=42, n_init=10.
    """
    df = pd.DataFrame(data_dict)
    X = df[selected_features].values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Scikit-learn K-Means with deterministic configuration
    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    cluster_labels = kmeans.fit_predict(X_scaled)
    inertia = float(kmeans.inertia_)

    # Silhouette score (if valid dataset size and k > 1)
    sil_score = None
    if len(df) > k and k >= 2:
        try:
            # Subsample for silhouette if large dataset to keep UI responsive
            if len(df) > 2500:
                sample_idx = np.random.RandomState(42).choice(len(df), size=2500, replace=False)
                sil_score = float(silhouette_score(X_scaled[sample_idx], cluster_labels[sample_idx]))
            else:
                sil_score = float(silhouette_score(X_scaled, cluster_labels))
        except Exception:
            sil_score = None

    return cluster_labels, inertia, sil_score, X_scaled, scaler.mean_, scaler.scale_

@st.cache_data(show_spinner=False)
def compute_elbow_and_metrics(data_dict: dict, selected_features: list, max_k: int = 8):
    """Calculate inertia and silhouette scores across K=2..max_k."""
    df = pd.DataFrame(data_dict)
    X = df[selected_features].values
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    k_values = list(range(2, max_k + 1))
    inertias = []
    sil_scores = []

    for k in k_values:
        km = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = km.fit_predict(X_scaled)
        inertias.append(float(km.inertia_))
        
        try:
            if len(df) > 2000:
                sample_idx = np.random.RandomState(42).choice(len(df), size=2000, replace=False)
                s = float(silhouette_score(X_scaled[sample_idx], labels[sample_idx]))
            else:
                s = float(silhouette_score(X_scaled, labels))
            sil_scores.append(s)
        except Exception:
            sil_scores.append(0.0)

    return k_values, inertias, sil_scores

# ---------------------------------------------------------
# 4. PCA for Visualization (>3 features)
# ---------------------------------------------------------
@st.cache_data(show_spinner=False)
def compute_pca_projection(X_scaled: np.ndarray, n_components: int = 3):
    """
    Separately apply PCA to the standardized features for visualization only.
    K-Means was fitted using the original selected features.
    """
    pca = PCA(n_components=min(n_components, X_scaled.shape[1]), random_state=42)
    X_pca = pca.fit_transform(X_scaled)
    var_ratio = pca.explained_variance_ratio_
    return X_pca, var_ratio

# ---------------------------------------------------------
# 5. Traceable Rule-Based Cluster Naming
# ---------------------------------------------------------
def apply_traceable_cluster_names(
    df_clustered: pd.DataFrame,
    cluster_labels: np.ndarray,
    income_col: str = None,
    spending_col: str = None,
    freq_col: str = None,
    recency_col: str = None
):
    """
    Rule-based mapping based on dataset-wide median thresholds:
    1. High income + high spending -> 'High-Value Customers'
    2. High income + low spending -> 'Potential Customers'
    3. Low income + high spending -> 'Budget-Loyal Customers'
    4. Low income + low spending + high recency -> 'At-Risk Customers'
    5. Moderate income + moderate spending + high purchase frequency -> 'Loyal Customers'
    Fallback -> 'Segment X'
    """
    df_temp = df_clustered.copy()
    df_temp["Cluster_ID"] = cluster_labels

    thresholds = {}
    
    # Calculate dataset-wide medians
    med_income = df_temp[income_col].median() if income_col and income_col in df_temp else None
    med_spending = df_temp[spending_col].median() if spending_col and spending_col in df_temp else None
    med_freq = df_temp[freq_col].median() if freq_col and freq_col in df_temp else None
    med_recency = df_temp[recency_col].median() if recency_col and recency_col in df_temp else None

    if med_income is not None:
        thresholds["Annual Income"] = med_income
    if med_spending is not None:
        thresholds["Spending Score"] = med_spending
    if med_freq is not None:
        thresholds["Purchase Frequency"] = med_freq
    if med_recency is not None:
        thresholds["Recency"] = med_recency

    unique_clusters = sorted(np.unique(cluster_labels))
    cluster_name_map = {}
    audit_trails = {}

    for c in unique_clusters:
        c_data = df_temp[df_temp["Cluster_ID"] == c]
        c_income = c_data[income_col].mean() if income_col and income_col in df_temp else None
        c_spending = c_data[spending_col].mean() if spending_col and spending_col in df_temp else None
        c_freq = c_data[freq_col].mean() if freq_col and freq_col in df_temp else None
        c_recency = c_data[recency_col].mean() if recency_col and recency_col in df_temp else None

        # Determine flags relative to medians
        is_high_income = (c_income >= med_income) if (c_income is not None and med_income is not None) else False
        is_low_income = (c_income < med_income) if (c_income is not None and med_income is not None) else False
        
        is_high_spending = (c_spending >= med_spending) if (c_spending is not None and med_spending is not None) else False
        is_low_spending = (c_spending < med_spending) if (c_spending is not None and med_spending is not None) else False

        # Moderate defined as within 15% of median: [0.85 * median, 1.15 * median]
        is_mod_income = (0.85 * med_income <= c_income <= 1.15 * med_income) if (c_income is not None and med_income is not None) else False
        is_mod_spending = (0.85 * med_spending <= c_spending <= 1.15 * med_spending) if (c_spending is not None and med_spending is not None) else False

        is_high_recency = (c_recency >= med_recency) if (c_recency is not None and med_recency is not None) else False
        is_high_freq = (c_freq >= med_freq) if (c_freq is not None and med_freq is not None) else False

        assigned_name = None
        matched_rule = None

        # Rule evaluation
        if is_mod_income and is_mod_spending and is_high_freq:
            assigned_name = "Loyal Customers"
            matched_rule = "Rule 5: Moderate Income + Moderate Spending + High Frequency"
        elif is_high_income and is_high_spending:
            assigned_name = "High-Value Customers"
            matched_rule = "Rule 1: High Income + High Spending"
        elif is_high_income and is_low_spending:
            assigned_name = "Potential Customers"
            matched_rule = "Rule 2: High Income + Low Spending"
        elif is_low_income and is_high_spending:
            assigned_name = "Budget-Loyal Customers"
            matched_rule = "Rule 3: Low Income + High Spending"
        elif is_low_income and is_low_spending and is_high_recency:
            assigned_name = "At-Risk Customers"
            matched_rule = "Rule 4: Low Income + Low Spending + High Recency"
        elif is_low_income and is_low_spending:
            assigned_name = "At-Risk Customers"
            matched_rule = "Rule 4 (Variant): Low Income + Low Spending"
        else:
            # Fallback
            assigned_name = f"Segment {c + 1}"
            matched_rule = "Fallback: Does not meet defined rules (no business assumption)"

        cluster_name_map[c] = assigned_name
        audit_trails[c] = {
            "name": assigned_name,
            "rule": matched_rule,
            "mean_income": c_income,
            "mean_spending": c_spending,
            "mean_freq": c_freq,
            "mean_recency": c_recency,
            "count": len(c_data),
            "share": f"{(len(c_data) / len(df_temp)) * 100:.1f}%"
        }

    return cluster_name_map, audit_trails, thresholds

# ---------------------------------------------------------
# Sidebar: Data Source & Feature Selection
# ---------------------------------------------------------
st.sidebar.header("📁 Data Input & Ingestion")

data_source = st.sidebar.radio(
    "Choose Dataset Source:",
    ["Pre-loaded 10,000 Customers Dataset", "Standard Mall Customers (200 rows)", "Upload CSV / Excel File"],
    index=0
)

uploaded_file = None
if data_source == "Upload CSV / Excel File":
    uploaded_file = st.sidebar.file_uploader("Upload dataset (CSV or XLSX)", type=["csv", "xlsx", "xls"])

# Load data based on selection
df_raw = None
if data_source == "Pre-loaded 10,000 Customers Dataset":
    df_raw = generate_sample_data(10000)
elif data_source == "Standard Mall Customers (200 rows)":
    df_raw = generate_sample_data(200)
else:
    if uploaded_file is not None:
        try:
            if uploaded_file.name.endswith(".csv"):
                df_raw = pd.read_csv(uploaded_file)
            else:
                df_raw = pd.read_excel(uploaded_file)
            
            if df_raw.empty:
                st.error("Error: The uploaded file is empty. Please upload a valid dataset.")
                st.stop()
        except Exception as e:
            st.error(f"Error reading file: {e}")
            st.stop()
    else:
        st.info("👈 Please upload a CSV or Excel file or switch to a pre-loaded dataset.")
        st.stop()

# ---------------------------------------------------------
# Data Cleaning & Missing Value Strategy
# ---------------------------------------------------------
st.markdown("### 1. Data Ingestion & Missing-Value Audit")

with st.spinner("Processing missing-value strategy..."):
    df_clean, rows_before, rows_after, rows_dropped, impute_stats = clean_and_impute_dataset(df_raw)

col_m1, col_m2, col_m3, col_m4 = st.columns(4)
col_m1.metric("Initial Uploaded Rows", f"{rows_before:,}")
col_m2.metric("Cleaned Rows", f"{rows_after:,}")
col_m3.metric("Rows Removed (>50% Null)", f"{rows_dropped}")
col_m4.metric("Data Retention", f"{(rows_after / rows_before) * 100:.1f}%")

if rows_dropped > 0:
    st.warning(
        f"⚠️ **Explicit Row Removal Warning**: {rows_dropped} rows were removed from the dataset "
        f"because more than 50% of their fields were missing. Data was not silently deleted."
    )
else:
    st.success("✅ No rows exceeded the 50% missing-field threshold. All rows retained.")

if impute_stats:
    with st.expander("🔍 Imputation Audit Log (Median for Numerical, Mode for Categorical)"):
        for col_name, method in impute_stats.items():
            st.write(f"- **{col_name}**: Missing values imputed using {method}")

# ---------------------------------------------------------
# Sidebar: Feature Selection & K Configuration
# ---------------------------------------------------------
st.sidebar.markdown("---")
st.sidebar.header("⚙️ Feature Selection & K-Means")

numeric_columns = [col for col in df_clean.columns if pd.api.types.is_numeric_dtype(df_clean[col]) and not col.lower().startswith("id")]

if not numeric_columns:
    st.error("No numeric columns found for clustering. Please ensure dataset has numerical features.")
    st.stop()

# Default feature selection
default_feats = [c for c in ["Annual Income ($)", "Spending Score (1-100)", "Age", "Purchase Frequency"] if c in numeric_columns]
if not default_feats:
    default_feats = numeric_columns[:min(3, len(numeric_columns))]

selected_features = st.sidebar.multiselect(
    "Select Features for K-Means Clustering:",
    options=numeric_columns,
    default=default_feats
)

if len(selected_features) < 1:
    st.sidebar.error("Select at least 1 feature for clustering.")
    st.stop()

# Number of clusters
k_clusters = st.sidebar.slider("Number of Clusters (K):", min_value=2, max_value=8, value=4, step=1)

st.sidebar.info(
    "🔒 **Reproducibility Settings**:\n"
    "- `random_state = 42`\n"
    "- `n_init = 10`\n"
    "- `StandardScaler` applied\n\n"
    "*Cluster IDs (0, 1, 2...) are arbitrary mathematical indices without inherent semantic order.*"
)

# ---------------------------------------------------------
# 2. Model Evaluation (Elbow & Silhouette)
# ---------------------------------------------------------
st.markdown("### 2. Model Evaluation & Optimal Cluster Analysis")

tab_eval, tab_elbow = st.tabs(["📊 Evaluation Overview", "📈 Inertia & Silhouette Curves"])

k_vals, inertias, sil_scores = compute_elbow_and_metrics(df_clean.to_dict("list"), selected_features, max_k=8)

with tab_eval:
    eval_c1, eval_c2 = st.columns(2)
    with eval_c1:
        st.markdown(f"**Current Selected K = {k_clusters}**")
        curr_idx = k_vals.index(k_clusters) if k_clusters in k_vals else 0
        st.metric("Inertia (Within-Cluster Sum of Squares)", f"{inertias[curr_idx]:,.1f}")
        st.caption("Lower inertia represents denser, more compact clusters. Use the elbow point to balance model complexity.")

    with eval_c2:
        curr_sil = sil_scores[curr_idx] if curr_idx < len(sil_scores) else 0.0
        st.metric("Silhouette Score", f"{curr_sil:.3f}")
        st.caption("Ranges from -1 to +1. Higher values indicate points are well-matched to their own cluster and distinct from neighbors.")

with tab_elbow:
    fig_eval = go.Figure()
    fig_eval.add_trace(go.Scatter(x=k_vals, y=inertias, mode='lines+markers', name='Inertia', line=dict(color='#2563eb', width=2.5)))
    fig_eval.add_vline(x=k_clusters, line_dash="dash", line_color="#ef4444", annotation_text=f"Selected K={k_clusters}")
    fig_eval.update_layout(
        title="Elbow Method: Inertia vs. Number of Clusters (K)",
        xaxis_title="Number of Clusters (K)",
        yaxis_title="Inertia (Sum of Squared Distances)",
        height=350,
        margin=dict(l=20, r=20, t=40, b=20)
    )
    st.plotly_chart(fig_eval, use_container_width=True)

# ---------------------------------------------------------
# 3. K-Means Execution
# ---------------------------------------------------------
with st.spinner("Fitting deterministic K-Means model..."):
    cluster_labels, inertia, sil_val, X_scaled, scaler_means, scaler_scales = compute_clustering_pipeline(
        df_clean.to_dict("list"), selected_features, k_clusters
    )

# ---------------------------------------------------------
# 4. Traceable Cluster Naming & Stability
# ---------------------------------------------------------
# Auto-detect relevant columns for business naming
income_candidate = next((c for c in df_clean.columns if "income" in c.lower()), None)
spending_candidate = next((c for c in df_clean.columns if "spend" in c.lower() or "purchase amount" in c.lower()), None)
freq_candidate = next((c for c in df_clean.columns if "freq" in c.lower()), None)
recency_candidate = next((c for c in df_clean.columns if "recency" in c.lower()), None)

cluster_names, audit_trails, thresholds = apply_traceable_cluster_names(
    df_clean, cluster_labels,
    income_col=income_candidate,
    spending_col=spending_candidate,
    freq_col=freq_candidate,
    recency_col=recency_candidate
)

# Attach results
df_result = df_clean.copy()
df_result["Cluster ID"] = cluster_labels
df_result["Segment Name"] = [cluster_names[c] for c in cluster_labels]

st.markdown("### 3. Traceable Customer Segment Profiles & Stability")

st.info(
    f"📐 **Dataset-Wide Median Thresholds Used for Rule-Based Naming**:\n" +
    " | ".join([f"**{k}**: {v:,.1f}" for k, v in thresholds.items()]) if thresholds else "No income/spending columns found. Assigned deterministic fallback segment labels."
)

stability_rows = []
for c, info in audit_trails.items():
    stability_rows.append({
        "Cluster ID": c,
        "Business Segment Name": info["name"],
        "Customer Count": f"{info['count']:,}",
        "Share (%)": info["share"],
        "Avg Income": f"${info['mean_income']:,.0f}" if info['mean_income'] else "N/A",
        "Avg Spending": f"{info['mean_spending']:.1f}" if info['mean_spending'] else "N/A",
        "Traceable Rule": info["rule"]
    })

st.table(pd.DataFrame(stability_rows))

# ---------------------------------------------------------
# 5. Cluster Visualizations (1D / 2D / 3D / PCA)
# ---------------------------------------------------------
st.markdown("### 4. Interactive Cluster Visualizations")

num_features = len(selected_features)

if num_features == 1:
    st.subheader(f"1D Visualization: {selected_features[0]}")
    fig_1d = px.strip(
        df_result,
        x=selected_features[0],
        color="Segment Name",
        hover_data=["Cluster ID", "Segment Name"],
        title=f"1D Strip Distribution along {selected_features[0]}"
    )
    st.plotly_chart(fig_1d, use_container_width=True)

elif num_features == 2:
    st.subheader(f"2D Visualization: {selected_features[0]} vs. {selected_features[1]}")
    fig_2d = px.scatter(
        df_result,
        x=selected_features[0],
        y=selected_features[1],
        color="Segment Name",
        hover_data=["Cluster ID", "Segment Name"] + selected_features,
        title=f"Direct 2D Feature Space ({selected_features[0]} vs {selected_features[1]})"
    )
    st.plotly_chart(fig_2d, use_container_width=True)

elif num_features == 3:
    st.subheader(f"3D Visualization: {selected_features[0]}, {selected_features[1]}, {selected_features[2]}")
    fig_3d = px.scatter_3d(
        df_result,
        x=selected_features[0],
        y=selected_features[1],
        z=selected_features[2],
        color="Segment Name",
        hover_data=["Cluster ID", "Segment Name"],
        title="Direct 3D Feature Space"
    )
    st.plotly_chart(fig_3d, use_container_width=True)

else:
    # More than 3 features -> PCA-Reduced View ONLY
    st.warning("🏷️ **PCA-Reduced View**")
    st.markdown(
        "> **Note:** *PCA is used only to visualize high-dimensional clustering results. "
        "K-Means was fitted using the original selected features.*"
    )

    X_pca, var_ratio = compute_pca_projection(X_scaled, n_components=3)
    
    # Display variance
    pca_c1, pca_c2, pca_c3 = st.columns(3)
    pca_c1.metric("PCA Component 1", f"{var_ratio[0]*100:.1f}% variance")
    pca_c2.metric("PCA Component 2", f"{var_ratio[1]*100:.1f}% variance")
    if len(var_ratio) > 2:
        pca_c3.metric("PCA Component 3", f"{var_ratio[2]*100:.1f}% variance")

    df_result["PCA_1"] = X_pca[:, 0]
    df_result["PCA_2"] = X_pca[:, 1]
    if X_pca.shape[1] > 2:
        df_result["PCA_3"] = X_pca[:, 2]

    view_dim = st.radio("PCA Visualization Mode:", ["2D PCA Projection", "3D PCA Projection"], horizontal=True)

    if view_dim == "2D PCA Projection":
        fig_pca_2d = px.scatter(
            df_result,
            x="PCA_1",
            y="PCA_2",
            color="Segment Name",
            hover_data=["Cluster ID", "Segment Name"] + selected_features,
            title=f"PCA 2D View (PC1: {var_ratio[0]*100:.1f}%, PC2: {var_ratio[1]*100:.1f}%)"
        )
        st.plotly_chart(fig_pca_2d, use_container_width=True)
    else:
        fig_pca_3d = px.scatter_3d(
            df_result,
            x="PCA_1",
            y="PCA_2",
            z="PCA_3",
            color="Segment Name",
            hover_data=["Cluster ID", "Segment Name"] + selected_features,
            title="PCA 3D View"
        )
        st.plotly_chart(fig_pca_3d, use_container_width=True)

# ---------------------------------------------------------
# 6. Customer Search, Filters & Export
# ---------------------------------------------------------
st.markdown("### 5. Customer Explorer & Consistent Data Export")

col_f1, col_f2 = st.columns(2)
with col_f1:
    selected_segment_filter = st.multiselect(
        "Filter by Business Segment:",
        options=list(set(df_result["Segment Name"])),
        default=list(set(df_result["Segment Name"]))
    )
with col_f2:
    search_query = st.text_input("Search Customer ID or Attributes:", "")

# Filter dataframe safely without altering original
filtered_df = df_result[df_result["Segment Name"].isin(selected_segment_filter)].copy()
if search_query.strip():
    mask = filtered_df.astype(str).apply(lambda row: row.str.contains(search_query, case=False).any(), axis=1)
    filtered_df = filtered_df[mask]

st.write(f"Showing **{len(filtered_df):,}** of **{len(df_result):,}** customers.")
st.dataframe(filtered_df.head(100), use_container_width=True)

# Download buttons (CSV and Excel)
col_dl1, col_dl2 = st.columns(2)
csv_buffer = filtered_df.to_csv(index=False).encode('utf-8')
col_dl1.download_button(
    label="📥 Download Clustered Customers (CSV)",
    data=csv_buffer,
    file_name="segmented_customers.csv",
    mime="text/csv"
)

# Excel Export
excel_buffer = io.BytesIO()
with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
    filtered_df.to_excel(writer, index=False, sheet_name="Segments")
col_dl2.download_button(
    label="📥 Download Clustered Customers (Excel)",
    data=excel_buffer.getvalue(),
    file_name="segmented_customers.xlsx",
    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
)

st.success("✨ Pipeline execution complete. Clustered dataset preserves all original fields with Cluster ID and Segment Name.")
