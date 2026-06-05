import { hostOf } from '@/lib/kinds'
import type { Journey } from '@/lib/types'
import { Chevron } from './Chevron'
import './Journey.css'

interface Props {
  journeys: Journey[]
  onSelect: (topic: string) => void
}

export function JourneyList({ journeys, onSelect }: Props) {
  if (!journeys.length) {
    return (
      <div className="journey-empty">
        <p>No journeys yet.</p>
        <p className="hint">
          As you browse around a topic, pages with a shared narrative thread (shopping for a car,
          researching a place, planning a trip) get grouped here automatically.
        </p>
      </div>
    )
  }

  return (
    <div className="journey-list">
      {journeys.map((j) => {
        const recentHost = j.entries.length
          ? hostOf(j.entries[j.entries.length - 1].url)
          : ''
        return (
          <button key={j.topic} className="journey-card" onClick={() => onSelect(j.topic)}>
            <div className="journey-card-head">
              <span className="journey-card-title">{j.topic}</span>
              <Chevron />
            </div>
            <div className="journey-card-meta">
              <span>
                {j.entries.length} stop{j.entries.length === 1 ? '' : 's'}
              </span>
              {j.people.length > 0 && (
                <>
                  <span className="sep">·</span>
                  <span>
                    {j.people.length} {j.people.length === 1 ? 'person' : 'people'}
                  </span>
                </>
              )}
              {j.highlightCount > 0 && (
                <>
                  <span className="sep">·</span>
                  <span>
                    {j.highlightCount} highlight{j.highlightCount === 1 ? '' : 's'}
                  </span>
                </>
              )}
              {recentHost && (
                <>
                  <span className="sep">·</span>
                  <span className="journey-card-host">latest {recentHost}</span>
                </>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
