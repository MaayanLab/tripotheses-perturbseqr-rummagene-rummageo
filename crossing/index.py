"""Build gene-to-signature lookups for any loaded GMT library."""

from collections import defaultdict


def build_inverted_index(signatures):
    """Return gene → signature positions; keep the input sequence unchanged."""
    gene_to_signature_positions = defaultdict(list)
    for signature_position, signature in enumerate(signatures):
        for gene in signature.genes:
            gene_to_signature_positions[gene].append(signature_position)
    # Convert to regular dict to prevent missing-key lookups from creating entries.
    return dict(gene_to_signature_positions)
