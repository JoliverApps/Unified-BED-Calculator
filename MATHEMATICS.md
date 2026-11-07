# Mathematical model and calculations

Unified BED Calculator uses the therapeutic form of the Resilience–Depletion (RD) law described by [Oliveira, Medical Physics 2026;53:e70490](https://doi.org/10.1002/mp.70490). The calculations compare schedules for one tissue response, using equal fractions and the same response parameters throughout.

## Acute survival and parameter interpretation

The RD premise is proportional depletion of a cellular resilience reserve as acute dose accumulates. For dose x, the therapeutic-form resilience and hazard are

$$
\rho(x)=re^{-sx},\qquad
h(x)=k\left(1-re^{-sx}\right).
$$

Integrating the hazard from zero dose gives the cumulative hazard and surviving fraction,

$$
H(x)=k\left[x-\frac rs\left(1-e^{-sx}\right)\right],
\qquad S(x)=e^{-H(x)},\qquad S(0)=1.
$$

Here k > 0 is the killing efficiency, s > 0 is the sensitization rate, and r is dimensionless. For a homogeneous single-target response, r characterizes the initial resilience reserve. An effective r < 0 describes an inverted-shoulder ensemble response. The BED calculations require r < 1 so that the initial slope is positive.

The three response geometries follow from

$$
H'(x)=k(1-re^{-sx}),\qquad H''(x)=krs e^{-sx}.
$$

For 0 < r < 1, the hazard rises toward k; for r < 0 it falls toward k. In both cases H increases with dose. At r = 0, H(x) = kx is the single-hit linear law. The s = 0 limit is also linear, with H(x) = k(1−r)x.

## Classical descriptors and signed conversion

The strict low-dose expansion is

$$
H(x)=\alpha x+\beta x^2+O(x^3),\qquad
\alpha=k(1-r),\qquad \beta=\frac{krs}{2}.
$$

These coefficients describe the expansion at zero dose. Their values need not equal coefficients obtained by fitting an LQ curve over an extended dose interval.

For s > 0, the high-dose tail approaches H(x) ≃ k(x−Dq), with

$$
D_0=\frac1k,\qquad D_q=\frac rs,\qquad
a\equiv\frac\alpha\beta=\frac{2(1-r)}{rs}.
$$

The Classical input mode uses a and Dq. For nonzero inputs with matching signs, it reconstructs

$$
r=\frac{\sqrt{D_q^2+2D_q a}-D_q}{a},\qquad s=\frac r{D_q},
$$

using the nonnegative principal square root. Positive inputs give 0 < r < 1 and s > 0. Negative inputs give r < 0 and s > 0. The inferred α remains positive for k > 0, while β has the sign of r.

For positive Dq, the code evaluates the same r using

$$
r=\frac{2D_q}{\sqrt{D_q^2+2D_q a}+D_q}
$$

to avoid subtracting close positive quantities. For negative Dq it evaluates the signed numerator directly, then calculates s = r/Dq. Both signed inputs are supplied by the user.

RD input mode calculates the corresponding Classical descriptors from a = 2(1−r)/(rs) and Dq = r/s when those ratios are defined. Converted fields retain six decimal places, and subsequent dose calculations use the values in the RD fields.

At r = 0, β = 0 and Dq = 0 for s > 0; a finite α/β is undefined. At s = 0, β = 0 and the finite tail-displacement mapping is unavailable. These linear cases are entered in RD Params mode, where the calculator evaluates their dose effects directly.

## Fractionation and BED

For total dose D delivered in n equal fractions, write d = D/n. With restoration of resilience between fractions, each fraction re-enters the same acute response law. Cumulative course hazard is therefore

$$
H_{\mathrm{course}}=nH(d).
$$

Normalizing by the initial hazard slope α = k(1−r) gives

$$
\mathrm{BED}(D,n;r,s)=\frac{nH(d)}\alpha
=\frac{1}{1-r}\left[D-\frac{nr}{s}
\left(1-e^{-sD/n}\right)\right].
$$

The killing-efficiency scale k cancels, so BED requires only r and s, or their Classical pair. The model used here has no explicit elapsed-time, dose-rate, repopulation, or incomplete-recovery term.

For r = 0 or s = 0, BED = D. At r = 1, α vanishes and the conventional BED normalization is undefined, even though the underlying acute hazard law remains defined.

The fraction-size expansion recovers

$$
\mathrm{BED}=nd\left[1+\frac{d}{a}+O(d^2)\right].
$$

For s > 0 and sd much larger than one, the tail approximation is

$$
\mathrm{BED}\simeq\frac{D-nD_q}{1-r}.
$$

## EQD2

Let B(d) denote BED per fraction:

$$
B(d)=\frac{1}{1-r}\left[d-\frac rs(1-e^{-sd})\right].
$$

With reference fraction size d₀ = 2 Gy, the equivalent fraction count and total dose are

$$
n_{\mathrm{EQD2}}=\frac{\mathrm{BED}(D_1,n_1;r,s)}{B(d_0)},
\qquad \mathrm{EQD2}=d_0 n_{\mathrm{EQD2}}.
$$

The displayed fraction count is continuous. In the linear cases B(d₀) = d₀, so EQD2 = D₁.

## Isoeffect inversion at fixed fraction count

For a reference BED₁ and a specified positive target fraction count n₂, the target total dose solves

$$
\mathrm{BED}(D_2,n_2;r,s)=\mathrm{BED}_1.
$$

For s > 0, define

$$
K=r+\frac{s(1-r)}{n_2}\mathrm{BED}_1.
$$

The exact inverse expression is

$$
D_2=\frac{n_2}{s}\left[K+W_0\!\left(-re^{-K}\right)\right],
\qquad d_2=\frac{D_2}{n_2},
$$

where W₀ is the principal real Lambert-W branch, defined by $W(z)e^{W(z)}=z$. The derivative

$$
\frac{\partial\mathrm{BED}}{\partial D}
=\frac{1-re^{-sD/n}}{1-r}>0
$$

for r < 1 and nonnegative dose ensures a unique positive target dose for positive BED₁. For a standard shoulder, the inverse argument lies between −1/e and zero; for an inverted shoulder it is positive. The principal real branch gives the required solution in both cases.

At r = 0, W₀(0) = 0 and the expression reduces to D₂ = BED₁ = D₁. The s = 0 limit is evaluated directly as D₂ = D₁.

## Numerical evaluation and displayed precision

The application uses JavaScript floating-point arithmetic. `Math.expm1(-sd)` evaluates exp(−sd)−1 for the BED and EQD2 denominators, retaining precision for small sd. The Lambert-W routine uses Halley iteration with up to 40 steps and a step tolerance of 10⁻¹².

The implementation applies these numerical rules:

| Quantity | Treatment |
| --- | --- |
| r near one | Inputs with 1−r ≤ 10⁻⁹ are rejected. |
| s near zero | Nonnegative s < 10⁻¹² Gy⁻¹ uses the linear dose limit. |
| Classical inputs near zero | α/β or Dq closer than 10⁻¹² Gy to zero is treated as zero and rejected in Classical mode. |
| Converted r, s, α/β, Dq | Written to the parameter fields with six decimal places. |
| Doses and BED | Displayed with two decimal places. |
| Calculation details | Displayed with six decimal places. |

Non-finite values, invalid square roots, invalid Lambert-W arguments, and nonpositive computed target doses produce validation messages. Very large inputs can exceed the floating-point range of the exponential terms.

## Implementation reference

The calculations are implemented in [app.js](app.js).

| Function | Calculation |
| --- | --- |
| `convertClassicalToRD` | Signed a, Dq → r, s reconstruction |
| `convertRDToClassical` | r, s → a, Dq conversion |
| `bedUnified` | Reference course BED |
| `denomBEDperFrac2Gy` | BED of one 2 Gy fraction |
| `updateReferenceDerived` | Reference BED, EQD2, and equivalent fraction count |
| `lambertW0` | Numerical principal-branch Lambert-W evaluation |
| `runCalculation` | Fixed-count isoeffect inversion and target-dose validation |

The [README](README.md) describes the application controls and local use.
