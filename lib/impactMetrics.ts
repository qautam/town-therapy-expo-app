import type { IoniconName } from '@/lib/icons';
import { getVolunteerLevel, getVolunteerLevelProgress, type VolunteerLevelName } from '@/lib/volunteerLevels';
import { Colors } from '@/constants/theme';
import type { DashboardStats } from '@/types/database';

/** Average per cleanup drive — transparent estimates for volunteer storytelling */
export const IMPACT_ESTIMATES = {
  hoursPerDrive: 3,
  wasteKgPerDrive: 8,
  spotsImprovedPerDrive: 1,
  neighborsReachedPerDrive: 12,
  pointsPerDrive: 10,
  pointsPerReport: 15,
} as const;

export type ImpactHighlight = {
  id: string;
  icon: IoniconName;
  value: string;
  label: string;
  detail: string;
  color: string;
  bgColor: string;
};

export type ImpactGoal = {
  title: string;
  subtitle: string;
  progress: number;
  targetLabel: string;
};

export type VolunteerImpactSummary = {
  eventsAttended: number;
  reportsFlagged: number;
  reportsResolved: number;
  levelName: VolunteerLevelName;
  impactScore: number;
  volunteerHours: number;
  wasteKgEstimate: number;
  spotsImproved: number;
  neighborsReached: number;
  town: DashboardStats;
  townReportTotal: number;
  documentationSharePercent: number;
  resolutionRatePercent: number;
  highlights: ImpactHighlight[];
  ripple: string[];
  nextGoal: ImpactGoal;
  headline: string;
  subheadline: string;
};

type BuildImpactInput = {
  eventsAttended: number;
  reportsFlagged: number;
  reportsResolved: number;
  town: DashboardStats;
  townReportTotal: number;
};

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function formatKg(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}t` : `${value} kg`;
}

export function buildVolunteerImpactSummary(input: BuildImpactInput): VolunteerImpactSummary {
  const { eventsAttended, reportsFlagged, reportsResolved, town, townReportTotal } = input;
  const level = getVolunteerLevel(eventsAttended);
  const { next, drivesToNext, progress } = getVolunteerLevelProgress(eventsAttended);

  const volunteerHours = eventsAttended * IMPACT_ESTIMATES.hoursPerDrive;
  const wasteKgEstimate = eventsAttended * IMPACT_ESTIMATES.wasteKgPerDrive;
  const spotsImproved = eventsAttended * IMPACT_ESTIMATES.spotsImprovedPerDrive;
  const neighborsReached = eventsAttended * IMPACT_ESTIMATES.neighborsReachedPerDrive;

  const impactScore =
    eventsAttended * IMPACT_ESTIMATES.pointsPerDrive +
    reportsFlagged * IMPACT_ESTIMATES.pointsPerReport +
    level.rankOrder * 5;

  const documentationSharePercent =
    townReportTotal > 0 ? clampPercent((reportsFlagged / townReportTotal) * 100) : 0;

  const resolutionRatePercent =
    reportsFlagged > 0 ? clampPercent((reportsResolved / reportsFlagged) * 100) : 0;

  const highlights: ImpactHighlight[] = [
    {
      id: 'hours',
      icon: 'time-outline',
      value: `${volunteerHours}h`,
      label: 'On-the-ground time',
      detail: `${eventsAttended} drive${eventsAttended === 1 ? '' : 's'} × ~${IMPACT_ESTIMATES.hoursPerDrive} hrs`,
      color: '#2E86AB',
      bgColor: '#E5F2F8',
    },
    {
      id: 'waste',
      icon: 'leaf-outline',
      value: formatKg(wasteKgEstimate),
      label: 'Waste diverted',
      detail: 'Estimated from cleanup drives',
      color: Colors.primary,
      bgColor: Colors.greenLight,
    },
    {
      id: 'reports',
      icon: 'megaphone-outline',
      value: `${reportsFlagged}`,
      label: 'Issues documented',
      detail:
        reportsResolved > 0
          ? `${reportsResolved} resolved · putting Hazaribagh on the record`
          : 'Reports that push authorities to act',
      color: '#B8860B',
      bgColor: '#FDF6E3',
    },
    {
      id: 'neighbors',
      icon: 'people-outline',
      value: `${neighborsReached}`,
      label: 'Neighbors reached',
      detail: 'Estimated people who benefit from your drives',
      color: '#7B4397',
      bgColor: '#F3E8F8',
    },
  ];

  const ripple: string[] = [];

  if (eventsAttended > 0) {
    ripple.push(
      `You've helped keep ~${spotsImproved} public spot${spotsImproved === 1 ? '' : 's'} cleaner for families in Hazaribagh.`
    );
    ripple.push(
      `Your ${volunteerHours} volunteer hours equal roughly ${Math.max(1, Math.round(volunteerHours / 8))} full workday${volunteerHours >= 16 ? 's' : ''} of civic action.`
    );
  }

  if (reportsFlagged > 0) {
    ripple.push(
      reportsResolved > 0
        ? `${reportsResolved} of your reported issues moved to resolved — real fixes, not just noise.`
        : `${reportsFlagged} issue${reportsFlagged === 1 ? '' : 's'} now on the public record, ready for reform.`
    );
  }

  if (town.resolved > 0 && reportsFlagged > 0) {
    ripple.push(
      `Town Therapy has ${town.resolved} resolved issue${town.resolved === 1 ? '' : 's'} town-wide — you're part of that momentum.`
    );
  }

  if (ripple.length === 0) {
    ripple.push('Show up to one drive or flag one issue — your dashboard starts measuring real change here.');
  }

  let nextGoal: ImpactGoal;
  if (eventsAttended === 0 && reportsFlagged === 0) {
    nextGoal = {
      title: 'Start your first ripple',
      subtitle: 'RSVP to a cleanup drive or submit a civic report.',
      progress: 0,
      targetLabel: '0 / 1 action',
    };
  } else if (next) {
    nextGoal = {
      title: `Reach ${next.name}`,
      subtitle: `${drivesToNext} more drive${drivesToNext === 1 ? '' : 's'} to level up your town impact.`,
      progress,
      targetLabel: `${eventsAttended} / ${next.minEvents} drives`,
    };
  } else {
    nextGoal = {
      title: 'Legend status unlocked',
      subtitle: 'Keep showing up — Hazaribagh notices.',
      progress: 1,
      targetLabel: 'Maximum level',
    };
  }

  const headline =
    impactScore >= 120
      ? 'You are shaping Hazaribagh'
      : impactScore >= 40
        ? 'Your work is adding up'
        : impactScore > 0
          ? 'Your impact journey started'
          : 'Ready to make a mark?';

  const subheadline =
    impactScore > 0
      ? `${impactScore} impact points from drives, reports, and your ${level.name} rank.`
      : 'Every drive and report turns into hours, cleaner spots, and pressure for reform.';

  return {
    eventsAttended,
    reportsFlagged,
    reportsResolved,
    levelName: level.name,
    impactScore,
    volunteerHours,
    wasteKgEstimate,
    spotsImproved,
    neighborsReached,
    town,
    townReportTotal,
    documentationSharePercent,
    resolutionRatePercent,
    highlights,
    ripple,
    nextGoal,
    headline,
    subheadline,
  };
}

export function getEmptyImpactPreview(): VolunteerImpactSummary {
  return buildVolunteerImpactSummary({
    eventsAttended: 0,
    reportsFlagged: 0,
    reportsResolved: 0,
    town: { issues: 0, resolved: 0, neighbors: 0 },
    townReportTotal: 0,
  });
}
