use strict; use warnings; use utf8;
local $/;
my $f = shift;
open my $fh, '<:encoding(UTF-8)', $f or die $!;
my $t = do { <$fh> };
close $fh;

# 1) Remove the MODELO button from the main WOD header row (keeps only QUADRO DA BOX)
$t =~ s/\s*<div class="field">\s*<button id="btnQuadroModelo"[^>]*>.*?<\/button>\s*<\/div>\s*//s;

# 2) Make QUADRO DA BOX button full width (only first occurrence)
$t =~ s/<button id="btnQuadroBox"\s+class="btn-secondary"\s+type="button">/<button id="btnQuadroBox" class="btn-secondary" type="button" style="width:100%;">/s;

# 3) Insert the MODELO button inside the Quadro modal, right after the helper text
my $anchor = '<p class="helper-text" style="margin-top:6px;">Texto guardado por data (offline). Podes colar o quadro completo (A/B/C/D) e consultar mais tarde.</p>';
my $insert = $anchor . "\n          <button id=\"btnQuadroModelo\" type=\"button\" class=\"btn-secondary\" style=\"width:100%; margin:8px 0 10px 0;\">📌 Modelo A/B/C/D</button>";
if (index($t, $anchor) >= 0) {
  $t =~ s/\Q$anchor\E/$insert/s;
} else {
  die "Anchor not found for modal insertion";
}

open my $out, '>:encoding(UTF-8)', $f or die $!;
print $out $t;
close $out;
