Mutations = new Meteor.Collection("mutations");

Mutations.attachSchema(new SimpleSchema({
  collaborations: { type: [String], min: 1 },
  study_label: { type: String },

  gene_label: { type: String },
  sample_label: { type: String },

  mutation_caller: {
    type: String,
    allowedValues: [
      "MuTect",
      "MuSE",
      // "iontorrent"
    ],
  },
  mutation_impact_assessor: {
    type: String,
    allowedValues: [
      "snpEff",
      "VEP",
      "Oncotator",
      "CHASM",
      "PolyPhen",
      "SIFT",
    ],
  },

  chromosome: { type: String },
  mutation_type: {
    type: String,
    allowedValues: [
      "SNP",
      // "MNP",
      "INS",
      "DEL",
      "COMPLEX",
    ],
  },
  reference_allele: { type: String },
  variant_allele: { type: [String] },

  start_position: { type: Number },
  end_position: { type: Number, optional: true },
  strand: { type: String, allowedValues: ["+", "-"] },

  biological_source: {
    type: String,
    allowedValues: [
      "DNA",
      "RNA",
      "Cellline",
    ],
  },


  // optional fields


  effect_impact: {
    type: String,
    allowedValues: [ "MODERATE", "MODIFIER", "HIGH" ],
    optional: true,
  },

  // replaces:
  // "functional_class": { type: String, label: "MISSENSE, NONSENSE, or SILENT",optional: true },
  sequence_ontology: {
    type: String,
    allowedValues: [
      "SY",	// Synonymous Variant
      "SL",	// Stop Lost
      "SG",	// Stop Gained
      "MS",	// Missense Variant
      "II",	// Inframe Insertion
      "FI",	// Frameshift Insertion
      "ID",	// Inframe Deletion
      "FD",	// Frameshift Deletion
      "CS",	// Complex Substitution
    ],
    optional: true,
  },
  protein_change: { type: String, optional: true },
  dn_snp_label: { type: String, optional: true },
  cosmic_id: { type: String, optional: true },

  chasm_driver_score: { type: Number, decimal: true, optional: true },
  chasm_driver_p_value: { type: Number, decimal: true, optional: true },
  chasm_driver_fdr: { type: Number, decimal: true, optional: true },

  vest_pathogenicity_score: { type: Number, decimal: true, optional: true },
  vest_pathogenicity_p_value: { type: Number, decimal: true, optional: true },
  vest_pathogenicity_fdr: { type: Number, decimal: true, optional: true },





  // // TODO: add these perhaps

  // "mutation_impact": { type: String, optional: true },
  // "mutation_impact_score": { type: Number, optional: true },
  //

  // "read_depth": { type: Number, label: "Total read depth for all samples", optional:true }, // TODO: from DP (in fake switch statement)
  // "genotype": { type: String, optional: true },
  //
  // // BELOW: other fields we will likely add
  // // these fields are not yet handled by the parser
  //
  // "allele_count": { type: Number, label: "Allele count in genotypes, for each ALT allele, in the same order as listed", optional:true },
  // "allele_frequency": { type: Number, decimal:true, label: "Allele frequency, for each ALT allele, in the same order as listed", optional:true },
  // "allele_number": { type: Number, label: "Number of unique alleles across all samples", optional:true },
  // "base_quality": { type: Number, decimal:true, label: "Overall average base quality", optional:true },
  //
  // // "genotype": { type: String } // GT string
  // // "genotype_quality" // GQ string
  // // "alternative_allele_observation" // AO  number
  // // "reference_allele_observation" // RO
  // // "biological_source": {
  // //   type: String,
  // //   allowedValues: [
  // //     "dna_normal",
  // //     "dna_tumor",
  // //     "rna_tumor",
  // //     "rna_tumor",
  // //     "cellline"
  // //   ],
  // //   optional: true,
  // // } // dna or rna String
  // // "alternative_allele_quality": "probability that the ALT allele is incorrectly specified, expressed on the the phred scale (-10log10(probability))" // from QUAL
  // // "qc_filter": { type: String, label: 'Either "PASS" or a semicolon-separated list of failed quality control filters' },
  //
  // "fraction_alt": { type: Number, decimal:true, label: "Overall fraction of reads supporting ALT", optional:true },
  // "indel_number": { type: Number, label: "Number of indels for all samples", optional:true },
  // "modification_base_changes": { type: String, label: "Modification base changes at this position", optional:true },
  // "modification_types": { type: String, label: "Modification types at this position", optional:true },
  // "sample_number": { type: Number, label: "Number of samples with data", optional:true },
  // "origin": { type: String, label: "Where the call originated from, the tumor DNA, RNA, or both", optional:true },
  // "strand_bias": { type: Number, decimal:true, label: "Overall strand bias", optional:true },
  // "somatic": { type: Boolean, label: "Indicates if record is a somatic mutation", optional:true },
  // "variant_status": { type: Number, label: "Variant status relative to non-adjacent Normal, 0=wildtype,1=germline,2=somatic,3=LOH,4=unknown,5=rnaEditing" , optional:true},
  // "reads_at_start": { type: Number, label: "Number of reads starting at this position across all samples", optional:true },
  // "reads_at_stop": { type: Number, label: "Number of reads stopping at this position across all samples", optional:true },
  // "variant_type": { type: String, label: "Variant type, can be SNP, INS or DEL", optional:true },
  // // "effects": {
  // //   type: [
  // //     new SimpleSchema({
  // //
  // //     });
  // //   ]
  // // }
  // // "effects": { type: [Object], label:"Predicted effects Effect ( Effect_Impact | Functional_Class | Codon_Change | Amino_Acid_change| Amino_Acid_length | Gene_Name | Transcript_BioType | Gene_Coding | Transcript_ID | Exon  | GenotypeNum [ | ERRORS | WARNINGS ] )" , optional:true }
}));
