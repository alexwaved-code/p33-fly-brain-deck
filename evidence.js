// References in APA 7 style, and the evidence behind each slide.
(function () {
  const doi = (d) => `<a href="https://doi.org/${d}" target="_blank" rel="noreferrer">https://doi.org/${d}</a>`;
  const url = (u) => `<a href="${u}" target="_blank" rel="noreferrer">${u}</a>`;
  const BERG_A = "Berg, S., Beckett, I. R., Costa, M., Schlegel, P., Januszewski, M., Marin, E. C., Nern, A., Preibisch, S., Qiu, W., Takemura, S.-y., Fragniere, A. M. C., Champion, A. S., Adjavon, D.-Y., Cook, M., Gkantia, M., Hayworth, K. J., Huang, G. B., ";

  window.REFS = {
    berg2025: {
      short: "Berg et al., 2025",
      apa: BERG_A + "Kämpf, F., Katz, W. T., . . . Jefferis, G. S. X. E. (2025). <i>Sexual dimorphism in the complete connectome of the Drosophila male central nervous system</i> [Preprint]. bioRxiv. " + doi("10.1101/2025.10.09.680999"),
    },
    berg2026: {
      short: "Berg et al., 2026",
      apa: BERG_A + "Katz, W. T., Kämpf, F., . . . Jefferis, G. S. X. E. (2026). Sexual dimorphism in the complete Drosophila male central nervous system connectome. <i>Cell, 189</i>(18), 5504–5526.e15. " + doi("10.1016/j.cell.2026.08.015"),
    },
    dorkenwald2024: {
      short: "Dorkenwald et al., 2024",
      apa: "Dorkenwald, S., Matsliah, A., Sterling, A. R., Schlegel, P., Yu, S.-c., McKellar, C. E., Lin, A., Costa, M., Eichler, K., Yin, Y., Silversmith, W., Schneider-Mizell, C., Jordan, C. S., Brittain, D., Halageri, A., Kuehner, K., Ogedengbe, O., Morey, R., Gager, J., . . . Murthy, M. (2024). Neuronal wiring diagram of an adult brain. <i>Nature, 634</i>(8032), 124–138. " + doi("10.1038/s41586-024-07558-y"),
    },
    janelia: {
      short: "Janelia Research Campus, n.d.",
      apa: "Janelia Research Campus. (n.d.). <i>Male CNS connectome</i> (Version 1.0) [Data set]. " + url("https://male-cns.janelia.org/"),
    },
    jj2026: {
      short: "Januszewski & Jain, 2026",
      apa: "Januszewski, M., & Jain, V. (2026, September 3). <i>5 amazing visuals show how the male fruit fly’s brain map is advancing neuroscience</i>. Google. " + url("https://blog.google/innovation-and-ai/technology/research/male-fruit-fly-brain-map/"),
    },
    januszewski2018: {
      short: "Januszewski et al., 2018",
      apa: "Januszewski, M., Kornfeld, J., Li, P. H., Pope, A., Blakely, T., Lindsey, L., Maitin-Shepard, J., Tyka, M., Denk, W., & Jain, V. (2018). High-precision automated reconstruction of neurons with flood-filling networks. <i>Nature Methods, 15</i>(8), 605–610. " + doi("10.1038/s41592-018-0049-4"),
    },
    vonp2011: {
      short: "von Philipsborn et al., 2011",
      apa: "von Philipsborn, A. C., Liu, T., Yu, J. Y., Masser, C., Bidaye, S. S., & Dickson, B. J. (2011). Neuronal control of <i>Drosophila</i> courtship song. <i>Neuron, 69</i>(3), 509–522. " + doi("10.1016/j.neuron.2011.01.011"),
    },
  };
  // order of the reference list: alphabetical, as APA asks
  window.REF_ORDER = ["berg2025", "berg2026", "dorkenwald2024", "janelia", "jj2026", "januszewski2018", "vonp2011"];

  const ABS = "Abstract, as posted with the preprint (Berg et al., 2025)";
  const Q1 = "We present the connectome of the entire Drosophila male central nervous system. This contains 166,691 neurons spanning the brain and nerve cord, fully proofread and annotated including fruitless/doublesex expression and 11,691 types.";
  const Q2 = "We provide the first comprehensive comparison between male and female brain connectomes to synaptic resolution, finding 7,205 isomorphic, 114 dimorphic, 262 male-specific and 69 female-specific types.";
  const Q3 = "This resource enables analysis of full sensory-to-motor circuits underlying complex behaviours and the impact of dimorphic elements.";
  const Q4 = "Sex-specific/dimorphic neurons are concentrated in higher brain centres while the sensory and motor periphery are largely isomorphic.";
  window.EVIDENCE = {
    6: [{ claim: "166,691 neurons, brain and nerve cord in one map", quote: Q1, where: ABS, refs: ["berg2026", "berg2025"] }],
    7: [{ claim: "Fully proofread, 11,691 types, fruitless and doublesex marked", quote: Q1, where: ABS, refs: ["berg2026", "berg2025"] },
        { claim: "Public write-up, 3 September 2026", refs: ["jj2026"] }],
    8: [{ claim: "2024: a female brain, 139,255 neurons, no nerve cord", refs: ["dorkenwald2024"] },
        { claim: "2026: a male, brain and nerve cord together", quote: Q1, where: ABS, refs: ["berg2026"] }],
    9: [{ claim: "A full circuit, from a sense to a movement, is in one map", quote: Q3, where: ABS, refs: ["berg2026"] }],
    10: [{ claim: "The map spans the brain and the nerve cord, so a path can be followed through the neck", quote: Q1, where: ABS, refs: ["berg2026"] }],
    11: [{ claim: "7,205 shared types, 114 dimorphic, 262 male-specific, 69 female-specific", quote: Q2, where: ABS, refs: ["berg2026", "berg2025"] }],
    13: [{ claim: "LC4 to giant fiber: 67, 65, 63, 63, 62, 61, 59, 58 synapses. Giant fiber to TTMn: 70. Acetylcholine.", where: "MaleCNS v1.0 traced weights, read from the public data set", refs: ["janelia", "berg2026"] }],
    14: [{ claim: "Sex-specific cells sit in higher centres. Sensory and motor cells are largely the same in both sexes.", quote: Q4, where: ABS, refs: ["berg2026"] },
         { claim: "First comparison at synaptic resolution: 7,205 the same, 114 different partners, 262 male-only, 69 female-only", quote: Q2, where: ABS, refs: ["berg2026", "berg2025"] },
         { claim: "fruitless and doublesex are marked on the cells", quote: Q1, where: ABS, refs: ["berg2026"] },
         { claim: "2024: a female brain, 139,255 neurons, no nerve cord", refs: ["dorkenwald2024"] }],
    17: [{ claim: "Seven electron microscopes, 13 months, 8 nm voxels, about 0.082 mm³, about 160 teravoxels", where: "Methods", refs: ["berg2026"] }],
    18: [{ claim: "Flood-filling networks grow a neuron outward from a seed", refs: ["januszewski2018"] },
         { claim: "About 46 million sending sites and 312 million receiving sites; precision about 0.82, recall about 0.81", where: "Methods", refs: ["berg2026"] }],
    19: [{ claim: "Splits and merges in the automatic draft are corrected by human proofreading", quote: Q1, where: ABS + " and Methods", refs: ["berg2026"] }],
    20: [{ claim: "Portal and download, free under CC BY", refs: ["janelia"] }],
    21: [{ claim: "Neuroglancer for 3D, neuPrint for connections (data set male-cns:v1.0)", refs: ["janelia"] }],
    22: [{ claim: "Open data under CC BY; no commercial product", refs: ["janelia"] }],
    23: [{ claim: "Whole central nervous system in one map", quote: Q1, where: ABS, refs: ["berg2026"] },
         { claim: "First male and female comparison at synaptic resolution", quote: Q2, where: ABS, refs: ["berg2026"] }],
  };
})();
